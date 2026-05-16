import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { auth, db } from '../config/firebase.js';

const router = Router();

const resetPasswordSchema = z.object({
  body: z.object({
    uid: z.string().min(1),
    newPassword: z.string().min(6),
  })
});

router.post('/reset-password', requireAuth, requireAdmin, validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { uid, newPassword } = req.body;
    await auth.updateUser(uid, { password: newPassword });
    res.json({ message: 'Password updated successfully' });
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      try {
        const userDoc = await db.collection('users').doc(req.body.uid).get();
        const email = userDoc.data()?.email;
        if (email) {
          const userRecord = await auth.getUserByEmail(email);
          await auth.updateUser(userRecord.uid, { password: req.body.newPassword });
          return res.status(200).json({ message: 'Password updated via email lookup' });
        }
      } catch (innerError) {
        // ignore
      }
      return res.status(404).json({ error: 'Firebase Auth user not found.' });
    }
    next(err);
  }
});

export default router;
