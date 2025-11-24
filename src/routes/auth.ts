import { Router } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { generateOTP, verifyOTP } from '../services/otpService';
import { CONFIG } from '../config';

const router = Router();

router.post('/otp', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });

    const otp = generateOTP(phone);
    console.log(`OTP for ${phone}: ${otp}`);
    res.json({ success: true });
});

router.post('/verify', async (req, res) => {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

    if (!verifyOTP(phone, otp)) {
        return res.status(401).json({ error: 'Invalid OTP' });
    }

    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
        user = await prisma.user.create({ data: { phone } });
    }

    const token = jwt.sign({ userId: user.id }, CONFIG.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
});

export default router;
