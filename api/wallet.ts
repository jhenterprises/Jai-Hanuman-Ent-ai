import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { db } from '../config/firebase.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { logger } from '../loggers/index.js';
import { logAudit, AuditAction } from '../loggers/audit.js';

const router = Router();

const transferSchema = z.object({
  body: z.object({
    targetUserId: z.string().min(1),
    amount: z.number().positive(),
    type: z.enum(['credit', 'debit', 'reverse']),
    reason: z.string().min(1)
  })
});

router.get('/balance', requireAuth, async (req: any, res) => {
  try {
    const doc = await db.collection('wallets').doc(req.user.uid).get();
    res.json({ balance: doc.exists ? doc.data()?.balance : 0 });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/transfer', requireAuth, requireAdmin, validate(transferSchema), async (req: any, res, next) => {
  const { targetUserId, amount, type, reason } = req.body;
  const adminId = req.user.uid;

  try {
    await db.runTransaction(async (t) => {
      const targetWalletRef = db.collection('wallets').doc(targetUserId);
      const targetDoc = await t.get(targetWalletRef);
      
      let currentBalance = 0;
      if (targetDoc.exists) {
        currentBalance = targetDoc.data()?.balance || 0;
      }
      
      let newBalance = currentBalance;
      if (type === 'credit') newBalance += amount;
      if (type === 'debit' || type === 'reverse') newBalance -= amount;

      if (newBalance < 0) {
        throw new Error('Insufficient balance');
      }

      t.set(targetWalletRef, {
        balance: newBalance,
        userId: targetUserId,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      const txId = db.collection('walletTransactions').doc().id;
      
      // Target Entry
      t.set(db.collection('walletTransactions').doc(`${txId}_target`), {
        txId,
        walletId: targetUserId,
        type: type === 'credit' ? 'credit' : 'debit',
        amount,
        balanceAfter: newBalance,
        reason,
        createdBy: adminId,
        createdAt: new Date().toISOString()
      });

      // Sender (Admin) Entry for double entry ledger
      t.set(db.collection('walletTransactions').doc(`${txId}_admin`), {
        txId,
        walletId: adminId, // system/admin reference
        type: type === 'credit' ? 'debit' : 'credit',
        amount,
        balanceAfter: 0, // system pool doesn't track balance in same way or track appropriately
        reason: `Transfer to ${targetUserId}`,
        createdBy: adminId,
        createdAt: new Date().toISOString()
      });
    });

    await logAudit({
      userId: adminId,
      action: type === 'credit' ? AuditAction.WALLET_CREDIT : type === 'debit' ? AuditAction.WALLET_DEBIT : AuditAction.WALLET_REVERSE,
      details: { targetUserId, amount, reason }
    });

    res.json({ success: true, message: `Wallet ${type} successful` });
  } catch (error: any) {
    logger.error('Wallet transfer failed: ', error);
    if (error.message === 'Insufficient balance') {
      res.status(400).json({ error: error.message });
    } else {
      next(error);
    }
  }
});

export default router;
