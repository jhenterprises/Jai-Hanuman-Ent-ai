import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, getDocs, addDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';

interface WalletContextType {
  balance: number;
  loading: boolean;
  refreshBalance: () => Promise<void>;
  deductBalance: (amount: number, description: string, txDetails?: any) => Promise<string>;
  addBalance: (amount: number, description: string, txDetails?: any) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    const setupListener = async () => {
      const user = auth.currentUser;
      if (!user) {
        setBalance(0);
        setLoading(false);
        return;
      }

      // Query wallet document
      const q = query(collection(db, 'wallets'), where('user_id', '==', user.uid));
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          setBalance(snapshot.docs[0].data().balance || 0);
        } else {
          setBalance(0);
          // Auto-create wallet if missing
          addDoc(collection(db, 'wallets'), {
            user_id: user.uid,
            balance: 0,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
          });
        }
        setLoading(false);
      }, (error) => {
        console.error("Wallet snapshot error:", error);
        setLoading(false);
      });
    };

    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setupListener();
      } else {
        setBalance(0);
        setLoading(false);
        unsubscribe();
      }
    });

    return () => {
      authUnsubscribe();
      unsubscribe();
    };
  }, []);

  const refreshBalance = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'wallets'), where('user_id', '==', user.uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setBalance(snap.docs[0].data().balance || 0);
    }
  };

  const deductBalance = async (amount: number, description: string, txDetails: any = {}) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const q = query(collection(db, 'wallets'), where('user_id', '==', user.uid));
    const walletSnap = await getDocs(q);
    if (walletSnap.empty) throw new Error("Wallet not found");
    const walletRef = doc(db, 'wallets', walletSnap.docs[0].id);

    return await runTransaction(db, async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      if (!walletDoc.exists()) throw new Error("Wallet not found");
      
      const currentBalance = walletDoc.data()?.balance || 0;
      
      if (currentBalance < amount) {
        throw new Error("Insufficient wallet balance");
      }

      const newBalance = currentBalance - amount;
      
      // Update wallet
      transaction.update(walletRef, {
        balance: newBalance,
        updated_at: serverTimestamp()
      });

      // Log transaction
      const logRef = doc(collection(db, 'wallet_logs'));
      transaction.set(logRef, {
        userId: user.uid,
        amount,
        type: 'debit',
        previousBalance: currentBalance,
        newBalance,
        reason: description,
        ...txDetails,
        createdAt: serverTimestamp()
      });

      // Log in financial transactions
      const txRef = doc(collection(db, 'financial_transactions'));
      transaction.set(txRef, {
        userId: user.uid,
        amount,
        status: txDetails.status || 'success',
        type: txDetails.type || 'service',
        description,
        ...txDetails,
        createdAt: serverTimestamp()
      });

      return txRef.id;
    });
  };

  const addBalance = async (amount: number, description: string, txDetails: any = {}) => {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");

    const q = query(collection(db, 'wallets'), where('user_id', '==', user.uid));
    const walletSnap = await getDocs(q);
    
    let walletRef = walletSnap.empty ? doc(collection(db, 'wallets')) : doc(db, 'wallets', walletSnap.docs[0].id);
    const isNewWallet = walletSnap.empty;

    return await runTransaction(db, async (transaction) => {
      let currentBalance = 0;
      
      if (!isNewWallet) {
        const walletDoc = await transaction.get(walletRef);
        if (walletDoc.exists()) {
          currentBalance = walletDoc.data()?.balance || 0;
          transaction.update(walletRef, {
            balance: currentBalance + amount,
            updated_at: serverTimestamp()
          });
        }
      } else {
        transaction.set(walletRef, {
            user_id: user.uid,
            balance: amount,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp()
        });
      }

      const newBalance = currentBalance + amount;

      // Log transaction
      const logRef = doc(collection(db, 'wallet_logs'));
      transaction.set(logRef, {
        userId: user.uid,
        amount,
        type: 'credit',
        previousBalance: currentBalance,
        newBalance,
        reason: description,
        ...txDetails,
        createdAt: serverTimestamp()
      });

      return logRef.id;
    });
  };

  return (
    <WalletContext.Provider value={{ balance, loading, refreshBalance, deductBalance, addBalance }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
