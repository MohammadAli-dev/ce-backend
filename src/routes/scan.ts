import { Router } from 'express';
import prisma from '../db';
import { CONFIG } from '../config';
import jwt from 'jsonwebtoken';

const router = Router();

const authenticate = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No token' });
    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, CONFIG.JWT_SECRET) as any;
        req.user = payload;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

router.post('/', authenticate, async (req: any, res: any) => {
    const { token, deviceId, gps } = req.body;
    const userId = req.user.userId;

    if (!token) return res.status(400).json({ error: 'Token required' });

    try {
        // 1. Lookup coupon
        const coupon = await prisma.coupon.findUnique({ where: { token } });
        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        // 2. Check status (optimistic)
        if (coupon.status === 'redeemed') {
            return res.status(409).json({ error: 'Coupon already redeemed' });
        }

        // 3. Transaction with unique constraint protection on Scan.couponId
        await prisma.$transaction(async (tx) => {
            // Insert Scan first. If couponId is already in Scan table, this throws UniqueConstraintViolation
            await tx.scan.create({
                data: {
                    couponId: coupon.id,
                    userId,
                    deviceId,
                    gps
                }
            });

            // Update coupon status
            await tx.coupon.update({
                where: { id: coupon.id },
                data: { status: 'redeemed' }
            });

            // Credit user
            await tx.transaction.create({
                data: {
                    userId,
                    amount: coupon.points,
                    type: 'credit'
                }
            });
        });

        res.json({ success: true, points: coupon.points });

    } catch (error: any) {
        if (error.code === 'P2002') { // Prisma unique constraint violation
            return res.status(409).json({ error: 'Coupon already redeemed (race detected)' });
        }
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
