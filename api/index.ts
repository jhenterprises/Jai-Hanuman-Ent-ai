import { Router } from 'express';
import authRouter from './auth.js';
import walletRouter from './wallet.js';
import bbpsRouter from './bbps.js';
import rechargeRouter from './recharge.js';
import paymentRouter from './payments.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use('/auth', authRouter);
router.use('/wallet', walletRouter);
router.use('/bbps', bbpsRouter);
router.use('/recharge', rechargeRouter);
router.use('/payments', paymentRouter);

export default router;
