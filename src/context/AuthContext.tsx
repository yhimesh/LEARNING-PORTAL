import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, testConnection } from '../lib/firebase';
import { UserProfile } from '../types';
import { createNotification } from '../services/notificationService';
import { sendEmailNotification } from '../services/emailService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  registerUser: (
    fullName: string,
    email: string,
    password: string,
    requestedRole: 'Trainee' | 'Trainer'
  ) => Promise<void>;
  loginUser: (email: string, password: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  resetUserPassword: (email: string) => Promise<void>;
  reloadProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to fetch user profile document from Firestore
  const fetchProfile = async (uid: string): Promise<UserProfile | null> => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error: any) {
      console.warn('Notice: Firestore user profile currently unavailable (offline or token service syncing):', error?.message || error);
      // Return null so onAuthStateChanged can build the fallback profile from Auth user details
      return null;
    }
  };

  const reloadProfile = async () => {
    if (auth.currentUser) {
      try {
        const profile = await fetchProfile(auth.currentUser.uid);
        if (profile) {
          setUserProfile(profile);
        }
      } catch (err) {
        console.warn('Profile reload notice:', err);
      }
    }
  };

  useEffect(() => {
    // Test Firestore connection on boot
    testConnection().catch(() => {});

    // Listen to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await fetchProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
          } else {
            // Fallback profile if Firestore is offline or during quick transitions
            const isAdminEmail =
              user.email === 'yhimeshc@gmail.com' ||
              user.email === 'admin@capacityconnect.edu';

            setUserProfile({
              uid: user.uid,
              fullName:
                user.displayName ||
                (user.email === 'yhimeshc@gmail.com' ? 'Himesh (Faculty Admin)' : user.email?.split('@')[0]) ||
                'User',
              email: user.email || '',
              requestedRole: isAdminEmail ? 'Trainer' : 'Trainee',
              accountStatus: 'active',
            });
          }
        } catch (authErr) {
          console.warn('Auth state sync notice:', authErr);
          const isAdminEmail =
            user.email === 'yhimeshc@gmail.com' ||
            user.email === 'admin@capacityconnect.edu';

          setUserProfile({
            uid: user.uid,
            fullName:
              user.displayName ||
              (user.email === 'yhimeshc@gmail.com' ? 'Himesh (Faculty Admin)' : user.email?.split('@')[0]) ||
              'User',
            email: user.email || '',
            requestedRole: isAdminEmail ? 'Trainer' : 'Trainee',
            accountStatus: 'active',
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const registerUser = async (
    fullName: string,
    email: string,
    password: string,
    requestedRole: 'Trainee' | 'Trainer'
  ) => {
    // 1. Role boundary check: Public registration is ONLY allowed for Trainee or Trainer
    if (requestedRole !== 'Trainee' && requestedRole !== 'Trainer') {
      throw new Error('Public registration is only allowed for Trainee or Trainer roles.');
    }

    const trimmedName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    // 2. Create the account using Firebase Authentication
    const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const user = credential.user;

    // 3. Update displayName in Firebase Auth
    try {
      await updateProfile(user, { displayName: trimmedName });
    } catch (e) {
      console.warn('Failed to update displayName on auth user:', e);
    }

    // 4. Create Firestore document at users/{uid}
    // Trainees are active by default. Trainers are pending approval by admin.
    const initialStatus = requestedRole === 'Trainee' ? 'active' : 'pending';
    const profileData: Omit<UserProfile, 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
      uid: user.uid,
      fullName: trimmedName,
      email: cleanEmail,
      requestedRole,
      accountStatus: initialStatus,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'users', user.uid), profileData);
      setUserProfile({
        ...profileData,
        createdAt: new Date(),
      });

      try {
        if (requestedRole === 'Trainer') {
          await createNotification({
            id: `pen_${user.uid}`,
            recipientUid: user.uid,
            type: 'trainer_pending_review',
            title: 'Trainer Application Received',
            message: 'Your application for faculty trainer status has been submitted. An administrator will review your credentials for approval.',
            relatedEntityId: user.uid,
            relatedEntityType: 'user',
          });

          // Dispatch email notification to platform administrator
          sendEmailNotification({
            eventType: 'admin_trainer_registered',
            recipientEmail: 'admin@capacityconnect.edu',
            recipientName: 'Portal Administrator',
            data: {
              trainerName: trimmedName,
              trainerEmail: cleanEmail,
              trainerUid: user.uid,
            },
            idempotencyKey: `email_reg_${user.uid}`,
          }).catch((emailErr) => console.warn('Notice: Non-critical email dispatch notice:', emailErr));
        } else {
          await createNotification({
            id: `wel_${user.uid}`,
            recipientUid: user.uid,
            type: 'system',
            title: 'Welcome to CAPACITY CONNECT',
            message: 'Your student trainee profile is now active. Explore our course catalog to begin skill development.',
            relatedEntityId: user.uid,
            relatedEntityType: 'user',
          });
        }
      } catch (notifErr) {
        console.warn('Notice: Non-critical registration alert notice:', notifErr);
      }
    } catch (firestoreError) {
      // Handle profile creation failures without silently pretending registration succeeded
      console.error('Failed to create profile in Firestore:', firestoreError);
      // Clean up auth user to avoid orphan auth accounts without profiles
      try {
        await user.delete();
      } catch (cleanupError) {
        console.error('Could not clean up auth account after profile failure:', cleanupError);
      }
      handleFirestoreError(firestoreError, OperationType.CREATE, `users/${user.uid}`);
    }
  };

  const loginUser = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const profile = await fetchProfile(credential.user.uid);
    if (profile) {
      setUserProfile(profile);
    }
  };

  const logoutUser = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
  };

  const resetUserPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim().toLowerCase());
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        registerUser,
        loginUser,
        logoutUser,
        resetUserPassword,
        reloadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
