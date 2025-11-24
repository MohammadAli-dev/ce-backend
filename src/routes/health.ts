import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

router.get('/version', (req, res) => {
    res.json({ version: '1.0.0', env: process.env.NODE_ENV || 'development' });
});

export default router;
