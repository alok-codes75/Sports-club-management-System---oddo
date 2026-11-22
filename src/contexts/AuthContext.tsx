import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '@/src/services/firebase';
import { enrollMemberRecord } from '@/src/services/clubServices';
import {
  BOOTSTRAPPED_OWNER_EMAIL,
  type MembershipTier,
  type PaymentMethod,
  type UserProfile,
  type UserRole,
} from '@/src/types/club';

export interface MemberSignUpPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  dob?: string;
  membershipTier?: MembershipTier | 'none';
  paymentMethod?: PaymentMethod;
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  effectiveRole: UserRole;
  previewRole: UserRole | null;
  setPreviewRole: (role: UserRole | null) => void;
  loading: boolean;
  authBusy: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (payload: MemberSignUpPayload) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapFirebaseAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';
  const rawMessage = err instanceof Error ? err.message : '';

  if (rawMessage.includes('requests-from-referer') || rawMessage.includes('API_KEY_HTTP_REFERRER_BLOCKED')) {
    return 'Your Firebase API key is restricted to another domain. Allow http://localhost:3000/* in Google Cloud Console (Credentials → Browser key) or switch firebase-applet-config.json to your own Firebase project.';
  }

  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Email/Password sign-up is not yet enabled in Firebase Console. Enable it under Authentication → Sign-in method → Email/Password, or use Continue with Google.';
    case 'auth/unauthorized-domain': {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      return `The domain "${host}" is not authorized in Firebase Auth. Open http://localhost:3000 or add "${host}" in Firebase Console → Authentication → Settings → Authorized domains.`;
    }
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Allow popups for localhost:3000 and try again.';
    case 'auth/network-request-failed':
      return 'Could not reach Firebase servers. Check your internet connection, VPN, or local firewall and try again.';
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'Invalid Firebase API key. Verify the values inside firebase-applet-config.json.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Switch to Sign In to access your account.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please double-check your credentials or create a new account.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a minute before trying again.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    default:
      return rawMessage || 'Authentication failed. Please try again.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [previewRole, setPreviewRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setFirebaseUser(user);
      setPreviewRole(null);

      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const userPath = `users/${user.uid}`;
      const userRef = doc(db, 'users', user.uid);

      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const isBootOwner =
            user.email?.toLowerCase() === BOOTSTRAPPED_OWNER_EMAIL.toLowerCase() &&
            user.emailVerified;
          const initialRole: UserRole = isBootOwner ? 'owner' : 'member';
          const payload: Record<string, unknown> = {
            uid: user.uid,
            email: (user.email ?? 'member@udaansportsclub.in').slice(0, 160),
            displayName: (user.displayName ?? 'Club Member').slice(0, 100),
            role: initialRole,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          if (user.photoURL) {
            payload.photoURL = user.photoURL.slice(0, 500);
          }
          await setDoc(userRef, payload);
        }

        unsubscribeProfile = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setProfile(docSnap.data() as UserProfile);
            }
            setLoading(false);
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, userPath);
          }
        );
      } catch (err) {
        setLoading(false);
        setAuthError(
          err instanceof Error
            ? err.message
            : 'Unable to initialize your club profile. Please try signing in again.'
        );
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const signInWithGoogle = async (): Promise<boolean> => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      return true;
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      return false;
    } finally {
      setAuthBusy(false);
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return true;
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      return false;
    } finally {
      setAuthBusy(false);
    }
  };

  const signUpWithEmail = async (payload: MemberSignUpPayload): Promise<boolean> => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      const cleanName = payload.fullName.trim().slice(0, 100);
      const cleanEmail = payload.email.trim().toLowerCase().slice(0, 160);

      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, payload.password);
      await updateProfile(cred.user, { displayName: cleanName });

      const userRef = doc(db, 'users', cred.user.uid);
      await setDoc(userRef, {
        uid: cred.user.uid,
        email: cleanEmail,
        displayName: cleanName,
        role: 'member',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Optionally activate a paid club membership immediately during sign-up
      if (payload.membershipTier && payload.membershipTier !== 'none') {
        await enrollMemberRecord({
          fullName: cleanName,
          email: cleanEmail,
          phone: (payload.phone ?? '+91 98000 00000').trim(),
          dob: payload.dob?.trim() || '',
          tier: payload.membershipTier,
          durationMonths: 1,
          paymentMethod: payload.paymentMethod ?? 'upi',
          userId: cred.user.uid,
          recordedByUid: cred.user.uid,
          notes: 'Registered via online Member Sign-Up portal',
        });
      }

      return true;
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      return false;
    } finally {
      setAuthBusy(false);
    }
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return true;
    } catch (err) {
      setAuthError(mapFirebaseAuthError(err));
      return false;
    } finally {
      setAuthBusy(false);
    }
  };

  const signOut = async () => {
    setAuthError(null);
    setPreviewRole(null);
    await firebaseSignOut(auth);
  };

  const actualRole: UserRole = profile?.role ?? 'member';
  const effectiveRole: UserRole =
    actualRole === 'owner' && previewRole ? previewRole : actualRole;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        effectiveRole,
        previewRole,
        setPreviewRole,
        loading,
        authBusy,
        authError,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        sendPasswordReset,
        signOut,
        clearAuthError: () => setAuthError(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
