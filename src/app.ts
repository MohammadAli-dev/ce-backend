import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import couponRoutes from './routes/coupons';
import scanRoutes from './routes/scan';
import prisma from './db';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/', healthRoutes);
app.use('/auth', authRoutes);
app.use('/coupons', couponRoutes);
app.use('/scan', scanRoutes);

app.get('/users/:id/wallet', async (req, res) => {
    const userId = parseInt(req.params.id);
    const transactions = await prisma.transaction.findMany({ where: { userId } });
    const balance = transactions.reduce((acc, t) => acc + (t.type === 'credit' ? t.amount : -t.amount), 0);
    res.json({ balance, transactions });
});

export default app;
