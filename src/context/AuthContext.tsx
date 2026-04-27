import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, getDocFromServer, enableNetwork, onSnapshot } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';

interface User {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  photoURL?: string;
  role: 'user' | 'staff' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser);
      if (firebaseUser) {
        setLoading(true);
        console.log('User is authenticated:', firebaseUser.uid);
        
        // Security: Only allow verified Google accounts if requested
        if (firebaseUser.providerData.some(p => p.providerId === 'google.com') && !firebaseUser.emailVerified) {
          console.log('Unverified Google account blocked in state listener');
          await signOut(auth);
          setUser(null);
          setLoading(false);
          return;
        }

        const userPath = `users/${firebaseUser.uid}`;
        console.log('Setting up user document listener:', userPath);
        
        let isMounted = true;
        const unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), async (userDoc) => {
          if (!isMounted) return;
          
          try {
            console.log('User document update received:', userDoc.exists() ? 'Found' : 'Not Found');
            
            if (userDoc.exists()) {
              const userData = userDoc.data() as User;
              // Ensure uid is set from firebaseUser as it might be missing in document
              userData.uid = firebaseUser.uid;
              
              // Force admin role for primary emails
              const adminEmails = ['pancardjhc2018@gmail.com', 'pavan.tr16@gmail.com', 'admin@jh.com'];
              if (firebaseUser.email && adminEmails.includes(firebaseUser.email)) {
                userData.role = 'admin';
              }
              
              setUser(userData);
              setLoading(false);
            } else {
              // This case handles Google login where doc might not exist yet
              const adminEmails = ['pancardjhc2018@gmail.com', 'pavan.tr16@gmail.com', 'admin@jh.com'];
              const newUser: User = {
                uid: firebaseUser.uid,
                name: firebaseUser.displayName || 'User',
                email: firebaseUser.email || '',
                photoURL: firebaseUser.photoURL || undefined,
                role: (firebaseUser.email && adminEmails.includes(firebaseUser.email)) ? 'admin' : 'user'
              };
              
              console.log('Creating new user document:', newUser);
              try {
                await setDoc(doc(db, 'users', firebaseUser.uid), {
                  ...newUser,
                  createdAt: serverTimestamp()
                }, { merge: true });
              } catch (e) {
                console.warn('Could not create user doc yet, listener will pick it up when online');
              }
              setUser(newUser);
              setLoading(false);
            }
          } catch (err) {
            console.error('Error processing user document snapshot:', err);
          }
        }, (err) => {
          if (!isMounted) return;
          console.error('User listener error:', err);
          
          if (err.message?.includes('permissions')) {
            console.error('Permission denied for user doc. Check Firestore Rules.');
          }
          
          // Fallback for admins if offline or permission error during bootstrap
          const adminEmails = ['pancardjhc2018@gmail.com', 'pavan.tr16@gmail.com', 'admin@jh.com'];
          if (firebaseUser.email && adminEmails.includes(firebaseUser.email)) {
            console.warn('Using admin fallback due to error:', err.message);
            setUser({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Admin (Emergency)',
              email: firebaseUser.email,
              role: 'admin'
            });
            setLoading(false);
          }
        });

        return () => {
          isMounted = false;
          unsubscribeUser();
        };
      } else {
        console.log('User is not authenticated');
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user.providerData.some(p => p.providerId === 'google.com') && !result.user.emailVerified) {
        await signOut(auth);
        throw new Error('Your Google account email is not verified. Please verify it or use another account.');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error('Email login failed:', error);
      console.log('Error code:', error?.code);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later.');
      }
      throw new Error('Login failed. Please check your credentials.');
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string, phone?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const newUser: User = {
        uid: firebaseUser.uid,
        name,
        email,
        phone,
        role: 'user'
      };

      const userPath = `users/${firebaseUser.uid}`;
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          ...newUser,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, userPath);
      }
      
      setUser(newUser);
    } catch (error: any) {
      console.error('Sign up failed:', error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please log in.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters.');
      }
      throw new Error('Sign up failed. Please try again.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, loginWithEmail, signUpWithEmail, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
