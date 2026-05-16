import { db } from '../config/firebase.js';

export enum AuditAction {
  USER_UPDATE = 'USER_UPDATE',
  WALLET_CREDIT = 'WALLET_CREDIT',
  WALLET_DEBIT = 'WALLET_DEBIT',
  WALLET_REVERSE = 'WALLET_REVERSE',
  BBPS_FETCH = 'BBPS_FETCH',
  BBPS_PAY = 'BBPS_PAY',
  RECHARGE = 'RECHARGE',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

export const logAudit = async (data: {
  userId: string;
  action: AuditAction;
  before?: any;
  after?: any;
  ipAddress?: string;
  details?: Record<string, any>;
}) => {
  try {
    await db.collection('auditLogs').add({
      ...data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
};
