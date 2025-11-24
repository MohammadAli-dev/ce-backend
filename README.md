# ce-backend

## 📖 Project Overview

`ce-backend` is a **minimal yet production‑ready** Node.js/TypeScript backend that demonstrates a complete flow for a coupon‑based reward system. It showcases:

- **Express** HTTP API with health, version, authentication (OTP), coupon generation, and redemption endpoints.
- **Prisma ORM** with a **SQLite** database (file‑based, perfect for CI/CD and local development).
- **JWT** based session handling and a simple admin API‑key guard.
- **Optimistic concurrency control** using a unique constraint on the `Scan` table – only one request can redeem a coupon, all others receive **HTTP 409**.
- **Comprehensive test suite** (Jest + Supertest) covering happy‑path flows and a **10‑concurrent‑request** race condition test.

The codebase follows a clean folder layout, strict TypeScript typing, and includes a **walkthrough** and **FIX_REPORT**‑style documentation for future maintainers.

---

## 🏗️ Architecture & Design

```
ce-backend/
├─ prisma/                # Prisma schema & migrations
│   └─ schema.prisma
├─ src/
│   ├─ config.ts          # Env config (PORT, JWT secret, admin key)
│   ├─ db.ts              # Prisma client singleton
│   ├─ services/
│   │   └─ otpService.ts  # Mockable OTP generator (used in tests)
│   ├─ routes/
│   │   ├─ health.ts      # GET /health
│   │   ├─ auth.ts        # OTP request & verification → JWT
│   │   ├─ coupons.ts     # Admin‑protected coupon generation
│   │   └─ scan.ts        # Atomic redemption with transaction & unique‑constraint guard
│   ├─ app.ts             # Express app wiring (middleware, routes)
│   ├─ server.ts          # HTTP server start (port from config)
│   └─ index.ts           # Entry point for `npm run dev`
├─ tests/
│   └─ api.test.ts        # Integration tests + concurrency test
├─ .env                   # Runtime env vars (JWT secret, admin key, DB URL)
├─ package.json
├─ tsconfig.json
└─ README.md
```

### Key Design Decisions

1. **SQLite + Prisma** – No external DB required; migrations are applied automatically on first run.
2. **Optimistic Concurrency** – `Scan.couponId` is declared `@unique`. The redemption flow runs inside a Prisma transaction; if the unique insert fails, we catch the Prisma error and return **409 Conflict**.
3. **Mockable OTP** – `otpService` returns a deterministic OTP during tests, allowing the test suite to retrieve the OTP directly without external SMS/email services.
4. **Admin API‑Key** – Simple header guard (`x-admin-key`) protects coupon generation; easy to replace with a full auth system later.
5. **Jest + Supertest** – All routes are exercised end‑to‑end, ensuring type safety and correct HTTP status handling.

---

## 🚀 Getting Started

### Prerequisites

- **Node ≥ 18** (tested on Node 20)
- **npm** (comes with Node)
- **Git** (for cloning)

### Clone the repository

```bash
git clone https://github.com/your‑org/ce-backend.git   # replace with actual URL if hosted
cd ce-backend
```

### Install dependencies

```bash
npm install
```

### Set up environment variables

Create a `.env` file at the project root (the file is already present in the scaffold). Example:

```dotenv
PORT=3015
JWT_SECRET=devsecret
ADMIN_API_KEY=adminkey123
DATABASE_URL=file:./dev.db
```

### Initialise the database

```bash
# Generate Prisma client & apply migrations (creates dev.db)
npx prisma generate
npx prisma migrate dev --name init   # runs the migration and creates dev.db
```

You should see output confirming the migration and client generation.

### Run the server (development mode)

```bash
npm run dev
```

The server starts on the port defined in `.env` (default **3015**). You can verify it with:

```bash
curl http://localhost:3015/health
# => { "status": "ok" }
```

---

## 🧪 Running the Test Suite

The project ships with a full Jest test suite that also validates the concurrency guarantee.

```bash
npm test
```

Expected output (all green):

```
> ce-backend@1.0.0 test
> jest --runInBand --detectOpenHandles

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        6.3 s
Ran all test suites.
```

### What the tests cover

| Test | Purpose |
|------|---------|
| **Health** | `/health` returns 200 and `{status:"ok"}` |
| **Version** | `/version` returns version & env |
| **OTP flow** | `/auth/otp` returns an OTP, `/auth/verify` returns a JWT |
| **Coupon generation** | Admin endpoint creates unique tokens (CSV/JSON) |
| **Redemption** | `/scan` atomically redeems a coupon, updates wallet & transaction |
| **Concurrency** | 10 parallel `POST /scan` calls – exactly **1** succeeds, **9** return **409** |
| **Wallet** | `/users/:id/wallet` reflects the correct points after redemption |

---

## 📂 Project Scripts (package.json)

| Script | Description |
|--------|-------------|
| `dev` | `ts-node-dev --respawn --transpile-only src/index.ts` – hot‑reload dev server |
| `build` | `tsc` – compile TypeScript to `dist/` |
| `start` | `node dist/index.js` – run compiled production server |
| `migrate` | `prisma migrate deploy` – apply migrations in production |
| `generate` | `prisma generate` – (re)generate Prisma client |
| `test` | `jest --runInBand --detectOpenHandles` – run all tests |

---

## 🛠️ Extending the Project

- **Add a real OTP provider** – replace `otpService` with Twilio, SendGrid, etc.
- **Swap SQLite for Postgres** – update `DATABASE_URL` and run `prisma migrate dev`.
- **Add rate‑limiting / request throttling** – plug in `express-rate-limit` middleware.
- **Deploy** – containerize with Docker (optional) or deploy to Vercel/Render using the `npm start` command.

---

## 📜 License

MIT – feel free to copy, modify, and use this as a starter for your own services.

---

## 🙋‍♂️ Author

Created by the **Antigravity** AI coding assistant (Google DeepMind Advanced Agentic Coding) as a demonstration of a fully‑tested, concurrency‑safe backend.
