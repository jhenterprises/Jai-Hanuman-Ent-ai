import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDocFromServer, enableNetwork, onSnapshot, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
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
  loginWithGoogleRedirect: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  loginAsDemo: (role: 'admin' | 'user') => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRedirectResult(auth).catch((error) => {
      console.error('Redirect sign in error:', error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setLoading(true);
        
        if (firebaseUser.providerData.some(p => p.providerId === 'google.com') && !firebaseUser.emailVerified) {
          await signOut(auth);
          setUser(null);
          setLoading(false);
          return;
        }

        let isMounted = true;
        const unsubscribeUser = onSnapshot(doc(db, 'users', firebaseUser.uid), async (userDoc) => {
          if (!isMounted) return;
          
          try {
            const isAdminEmail = firebaseUser.email && (
              /pancardjhc2018@gmail.com|shahisthabanu78@gmail.com|admin@jhportal.gov.in/i.test(firebaseUser.email)
            );

            if (userDoc.exists()) {
              const userData = userDoc.data() as User;
              userData.uid = firebaseUser.uid;
              
              if (isAdminEmail && userData.role !== 'admin') {
                userData.role = 'admin';
                try {
                  await setDoc(doc(db, 'users', firebaseUser.uid), { role: 'admin' }, { merge: true });
                } catch (err) {
                  console.error('Error auto-evaluating user to admin:', err);
                }
              }

              setUser(userData);
              setLoading(false);
            } else {
              // No user document exists under this UID. Let's look for a pre-created (orphan) user doc with this email.
              let existingData: any = null;
              let existingDocId: string | null = null;

              if (firebaseUser.email) {
                try {
                  const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
                  const querySnap = await getDocs(q);
                  const match = querySnap.docs.find(d => d.id !== firebaseUser.uid);
                  if (match) {
                    existingData = match.data();
                    existingDocId = match.id;
                  }
                } catch (err) {
                  console.error('Error querying pre-existing user email:', err);
                }
              }

              const newUser: any = {
                uid: firebaseUser.uid,
                name: existingData?.name || firebaseUser.displayName || (isAdminEmail ? 'JH Admin' : 'User'),
                email: firebaseUser.email || '',
                photoURL: firebaseUser.photoURL || undefined,
                role: existingData?.role || (isAdminEmail ? 'admin' : 'user'),
                phone: existingData?.phone || '',
                status: existingData?.status || 'active',
                staff_id: existingData?.staff_id || undefined,
                salary_amount: existingData?.salary_amount || undefined,
                designation: existingData?.designation || undefined,
                address: existingData?.address || undefined,
                blood_group: existingData?.blood_group || undefined,
                joining_date: existingData?.joining_date || undefined,
              };
              
              try {
                // Save under user's actual Auth UID so everything is tied to their account!
                await setDoc(doc(db, 'users', firebaseUser.uid), {
                  ...newUser,
                  createdAt: existingData?.created_at || existingData?.createdAt || serverTimestamp(),
                  updated_at: serverTimestamp()
                }, { merge: true });

                // Delete or clear the pre-created orphan document
                if (existingDocId) {
                  try {
                    await deleteDoc(doc(db, 'users', existingDocId));
                  } catch (deleteErr) {
                    console.warn('Could not delete migration source doc, attempting overwrite/mark instead:', deleteErr);
                    try {
                      await setDoc(doc(db, 'users', existingDocId), {
                        email: `migrated_${Date.now()}_${existingData.email}`,
                        migrated_to: firebaseUser.uid,
                        status: 'disabled'
                      }, { merge: true });
                    } catch (updateErr) {
                      console.error('Failed to clear migration source doc:', updateErr);
                    }
                  }
                }
              } catch (e) {
                console.warn('Could not create user doc yet, listener will pick it up when online:', e);
              }
              setUser(newUser);
              setLoading(false);
            }
          } catch (err) {
            console.error('Error processing user document snapshot:', err);
          }
        }, (err) => {
          if (!isMounted) return;
          console.error('Permission error on user listener:', err);
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        });

        return () => {
          isMounted = false;
          unsubscribeUser();
        };
      } else {
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
    } catch (error: any) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const loginWithGoogleRedirect = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error('Login redirect failed:', error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      const errorCode = error?.code || '';
      
      if (errorCode === 'auth/invalid-credential' || 
          errorCode === 'auth/wrong-password' || 
          errorCode === 'auth/user-not-found' ||
          error.message?.includes('invalid-credential')) {
        throw new Error('Invalid email or password. If you signed up with Google, please use the "Sign in with Google" button instead.');
      } else if (errorCode === 'auth/too-many-requests') {
        throw new Error('Too many failed attempts. Please try again later or reset your password.');
      } else if (errorCode === 'auth/user-disabled') {
        throw new Error('This account has been disabled. Please contact support.');
      }
      
      throw new Error(error.message || 'Login failed. Please check your credentials.');
    }
  };

  const signUpWithEmail = async (email: string, password: string, name: string, phone?: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const isAdminEmail = email && (
        /pancardjhc2018@gmail.com|shahisthabanu78@gmail.com|admin@jhportal.gov.in/i.test(email)
      );

      const newUser: User = {
        uid: firebaseUser.uid,
        name,
        email,
        phone,
        role: isAdminEmail ? 'admin' : 'user'
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
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('This email is already registered. Please log in.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Password should be at least 6 characters.');
      }
      throw new Error('Sign up failed. Please try again.');
    }
  };

  const loginAsDemo = async (role: 'admin' | 'user') => {
    const email = role === 'admin' ? 'admin@jhportal.gov.in' : 'citizen@jhportal.gov.in';
    const password = role === 'admin' ? 'admin123' : 'citizen123';
    const name = role === 'admin' ? 'JH Admin' : 'Jharkhand Citizen';
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      const errorCode = error?.code || '';
      if (errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential' || error.message?.includes('invalid-credential') || error.message?.includes('user-not-found')) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;
          
          const newUser: User = {
            uid: firebaseUser.uid,
            name,
            email,
            role,
            phone: role === 'admin' ? '+91 99999 88888' : '+91 99999 11111'
          };
          
          const userPath = `users/${firebaseUser.uid}`;
          try {
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              ...newUser,
              createdAt: serverTimestamp()
            });
          } catch (writeError) {
            handleFirestoreError(writeError, OperationType.WRITE, userPath);
          }
          
          setUser(newUser);
          return;
        } catch (signUpError) {
          console.error('Demo auto-signup failed:', signUpError);
          throw signUpError;
        }
      }
      throw error;
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
    <AuthContext.Provider value={{ user, loginWithGoogle, loginWithGoogleRedirect, loginWithEmail, signUpWithEmail, loginAsDemo, logout, loading }}>
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
