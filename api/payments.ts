import { Router } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post("/create-order", requireAuth, async (req, res) => {
  const { amount, currency = 'INR', userId } = req.body;
  
  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Amount must be at least 100 paise (1 INR)' });
  }

  try {
    const rzpOptions = {
      key_id: (env.RAZORPAY_KEY_ID || '').trim(),
      key_secret: (env.RAZORPAY_KEY_SECRET || '').trim(),
    };
    
    if (!rzpOptions.key_id || !rzpOptions.key_id.startsWith('rzp_')) {
       return res.json({
         order_id: `mock_order_${Date.now()}`,
         amount: Math.round(amount),
         currency: currency,
         is_mock: true
       });
    }

    const razorpay = new Razorpay(rzpOptions);
    const options = {
      amount: Math.round(amount),
      currency,
      receipt: `receipt_${Date.now()}_${userId || 'anon'}`.substring(0, 40),
    };

    const order = await razorpay.orders.create(options);

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create Razorpay order', message: error.message || error });
  }
});

router.post("/verify-payment", requireAuth, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id) {
    return res.status(400).json({ error: 'Missing payment details' });
  }

  if (razorpay_order_id.startsWith('mock_order_')) {
    return res.json({ success: true, message: "Mock Payment verified successfully" });
  }

  if (!razorpay_signature) {
    return res.status(400).json({ error: 'Missing payment signature' });
  }

  const secret = (env.RAZORPAY_KEY_SECRET || '').trim();

  const sign = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac("sha256", secret)
    .update(sign.toString())
    .digest("hex");

  if (razorpay_signature === expectedSign) {
    res.json({ success: true, message: "Payment verified successfully" });
  } else {
    res.status(400).json({ success: false, message: "Invalid payment signature" });
  }
});

export default router;
