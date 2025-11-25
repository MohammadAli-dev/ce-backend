# BACKEND_MODULE_1

## Project Overview

- **Repository**: `ce-backend` (located at `c:/newprojects/caceasy/ce-backend`)
- **Tech Stack**: Node.js (v18+), TypeScript, Express, Prisma ORM with SQLite, JWT, Jest + Supertest.
- **Purpose**: Demonstrates a coupon‑based reward system with OTP authentication, admin‑protected coupon generation, atomic redemption with concurrency safety, and a full test suite.

## Directory Structure
```
ce-backend/
├─ .env                     # runtime env vars (PORT, JWT_SECRET, ADMIN_API_KEY, DATABASE_URL)
├─ package.json
├─ tsconfig.json
├─ prisma/
│   └─ schema.prisma       # Prisma data model
├─ src/
│   ├─ config.ts           # reads env vars
│   ├─ db.ts               # Prisma client singleton
│   ├─ services/
│   │   └─ otpService.ts   # mockable OTP generator used in tests
│   ├─ routes/
│   │   ├─ health.ts       # GET /health
│   │   ├─ auth.ts         # OTP request & verification → JWT
│   │   ├─ coupons.ts      # Admin‑key protected coupon generation
│   │   └─ scan.ts         # Atomic coupon redemption with unique‑constraint guard
│   ├─ app.ts              # Express app wiring (middleware, routes)
│   ├─ server.ts           # HTTP server start (port from config)
│   └─ index.ts            # Entry point for `npm run dev`
├─ src/tests/
│   └─ api.test.ts         # Integration tests + concurrency test
└─ README.md               # Project description, setup, usage
```

## Key Features
- **Health & Version** endpoints (`/health`, `/version`).
- **OTP flow** (`POST /auth/otp` returns a mock OTP, `POST /auth/verify` returns a JWT).
- **Coupon generation** (`POST /coupons/generate`) – admin API‑key protected, creates a batch of unique UUID‑v4 tokens stored in SQLite.
- **Redemption** (`POST /scan`) – runs a Prisma transaction; inserts a `Scan` record with a unique `couponId`. If the unique constraint fails, the request returns **409 Conflict** (concurrency safe).
- **Wallet endpoint** (`GET /users/:id/wallet`) – returns user points based on successful scans.
- **Comprehensive tests** using Jest + Supertest, including a 10‑concurrent‑request race condition test that verifies only one request can redeem a coupon.

## How to Run Locally (quick cheat‑sheet)
```bash
# 1. Install dependencies
npm install

# 2. Set up environment (already present as .env, adjust if needed)
#    PORT=3015, JWT_SECRET=devsecret, ADMIN_API_KEY=adminkey123, DATABASE_URL=file:./dev.db

# 3. Generate Prisma client & apply migrations (creates dev.db)
npx prisma generate
npx prisma migrate dev --name init

# 4. Start the development server
npm run dev   # listens on http://localhost:3015

# 5. Verify health
curl http://localhost:3015/health   # -> {"status":"ok"}

# 6. Run the full test suite
npm test
```
All tests should pass (`8 passed, 0 failed`).

## Important Commands Used During Development
- `npx prisma generate` – generate Prisma client.
- `npx prisma migrate dev --name init` – create SQLite DB and apply schema.
- `npm run dev` – hot‑reload server with `ts-node-dev`.
- `npm test` – runs Jest with `--runInBand` for deterministic ordering.

## Concurrency Strategy (from FIX_REPORT.txt)
- SQLite lacks `FOR UPDATE`. We rely on a **unique constraint** on `Scan.couponId`.
- Redemption flow:
  1. Find coupon by token.
  2. If already redeemed → 409.
  3. Execute a Prisma `$transaction` that:
     - Inserts a `Scan` row (fails if another transaction already inserted the same `couponId`).
     - Updates `Coupon.status` to `redeemed`.
     - Inserts a `Transaction` record for the user.
  4. Catch `Prisma.PrismaClientKnownRequestError` with code `P2002` (unique‑constraint violation) and return 409.
- This mirrors the lessons from `FIX_REPORT.txt` about optimistic concurrency and handling race conditions without DB‑level locks.

## Next Steps (when you return)
- **Add rate‑limiting** or **request throttling** for the `/scan` endpoint.
- **Persist OTPs** (e.g., via Redis) if you need real‑world expiration.
- **Dockerize** (optional) for CI pipelines.
- **Expand documentation** (e.g., Swagger/OpenAPI spec).

---