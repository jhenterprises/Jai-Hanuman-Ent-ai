import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, async (req, res) => {
  const { type, number, operator, amount } = req.body;
  setTimeout(() => {
    res.json({ 
      success: true, 
      message: "Recharge successful", 
      refNo: "REC" + Math.floor(Math.random() * 100000000) 
    });
  }, 1000);
});

export default router;
