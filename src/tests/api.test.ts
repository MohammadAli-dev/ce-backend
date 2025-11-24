import request from 'supertest';
import app from '../app';
import prisma from '../db';
import { CONFIG } from '../config';

describe('API Tests', () => {
    let adminToken: string;
    let userToken: string;
    let userId: number;
    let batchId: number;
    let couponToken: string;

    beforeAll(async () => {
        // Clean DB
        await prisma.transaction.deleteMany();
        await prisma.scan.deleteMany();
        await prisma.coupon.deleteMany();
        await prisma.batch.deleteMany();
        await prisma.user.deleteMany();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe('Health Check', () => {
        it('should return 200 OK', async () => {
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });

    describe('Auth Flow', () => {
        it('should request OTP', async () => {
            const res = await request(app).post('/auth/otp').send({ phone: '1234567890' });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should verify OTP and return token', async () => {
            const res = await request(app).post('/auth/verify').send({ phone: '1234567890', otp: '123456' });
            expect(res.status).toBe(200);
            expect(res.body.token).toBeDefined();
            userToken = res.body.token;

            // Get userId from DB
            const user = await prisma.user.findUnique({ where: { phone: '1234567890' } });
            userId = user!.id;
        });
    });

    describe('Coupons', () => {
        it('should generate coupons (Admin)', async () => {
            const res = await request(app)
                .post('/coupons/generate')
                .set('x-api-key', CONFIG.ADMIN_API_KEY)
                .send({ count: 5, points: 100, batchName: 'TestBatch', sku: 'SKU123' });

            expect(res.status).toBe(200);
            expect(res.body.count).toBe(5);
            expect(res.body.tokens).toHaveLength(5);
            batchId = res.body.batchId;
            couponToken = res.body.tokens[0];
        });
    });

    describe('Scan & Redemption', () => {
        it('should redeem a coupon successfully', async () => {
            const res = await request(app)
                .post('/scan')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ token: couponToken, deviceId: 'dev1', gps: '0,0' });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.points).toBe(100);

            // Verify DB state
            const coupon = await prisma.coupon.findUnique({ where: { token: couponToken } });
            expect(coupon?.status).toBe('redeemed');

            const scan = await prisma.scan.findFirst({ where: { couponId: coupon!.id } });
            expect(scan).toBeDefined();

            const tx = await prisma.transaction.findFirst({ where: { userId } });
            expect(tx?.amount).toBe(100);
        });

        it('should fail to redeem already redeemed coupon', async () => {
            const res = await request(app)
                .post('/scan')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ token: couponToken, deviceId: 'dev1', gps: '0,0' });

            expect(res.status).toBe(409);
        });
    });

    describe('Concurrency Test', () => {
        it('should handle concurrent scans for the same coupon correctly', async () => {
            // Generate a new coupon for this test
            const genRes = await request(app)
                .post('/coupons/generate')
                .set('x-api-key', CONFIG.ADMIN_API_KEY)
                .send({ count: 1, points: 50, batchName: 'ConcurrencyBatch', sku: 'SKU999' });

            const targetToken = genRes.body.tokens[0];

            // Prepare 10 concurrent requests
            const requests = [];
            for (let i = 0; i < 10; i++) {
                requests.push(
                    request(app)
                        .post('/scan')
                        .set('Authorization', `Bearer ${userToken}`)
                        .send({ token: targetToken, deviceId: `dev${i}`, gps: '0,0' })
                );
            }

            const responses = await Promise.all(requests);

            const successes = responses.filter(r => r.status === 200);
            const conflicts = responses.filter(r => r.status === 409);

            expect(successes.length).toBe(1);
            expect(conflicts.length).toBe(9);
        });
    });

    describe('Wallet', () => {
        it('should return correct wallet balance', async () => {
            const res = await request(app).get(`/users/${userId}/wallet`);
            expect(res.status).toBe(200);
            // 100 from first scan + 50 from concurrency test success = 150
            expect(res.body.balance).toBe(150);
        });
    });
});
