import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/bill-fetch', requireAuth, async (req, res) => {
  const { category, consumerId, provider } = req.body;
  setTimeout(() => {
    res.json({
      success: true,
      customerName: "JH DIGITAL CUSTOMER",
      billAmount: Math.floor(Math.random() * 5000) + 100,
      dueDate: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0],
      billId: "BBPS" + Math.floor(Math.random() * 1000000)
    });
  }, 800);
});

router.post('/bill-pay', requireAuth, async (req, res) => {
  setTimeout(() => {
    res.json({
      success: true,
      message: "Bill paid successfully",
      refNo: "BBPS" + Math.floor(Math.random() * 100000000)
    });
  }, 1000);
});

export default router;
