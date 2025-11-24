import { Router } from 'express';
import prisma from '../db';
import { CONFIG } from '../config';

const router = Router();

router.post('/generate', async (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== CONFIG.ADMIN_API_KEY) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { count, points, batchName, sku } = req.body;
    if (!count || !points || !batchName || !sku) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    const batch = await prisma.batch.create({
        data: { name: batchName, sku }
    });

    // Generate unique tokens
    const couponsData = [];
    for (let i = 0; i < count; i++) {
        couponsData.push({
            token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            batchId: batch.id,
            points,
            status: 'issued'
        });
    }

    // Create coupons
    for (const c of couponsData) {
        await prisma.coupon.create({ data: c });
    }

    res.json({ success: true, count, batchId: batch.id, tokens: couponsData.map(c => c.token) });
});

export default router;
