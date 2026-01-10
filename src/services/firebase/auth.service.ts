import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { User } from '../../types';

export const authService = {
  // Sign up with email and password
  signUp: async (
    email: string,
    password: string,
    displayName: string
  ): Promise<User> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // Update profile
      await updateProfile(firebaseUser, { displayName });

      // Create user document in Firestore
      const newUser: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName,
        dietaryRestrictions: [],
        allergies: [],
        cuisinePreferences: [],
        priceRangePreference: '$$',
        friends: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...newUser,
        createdAt: newUser.createdAt.toISOString(),
        updatedAt: newUser.updatedAt.toISOString(),
      });

      return newUser;
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string): Promise<User> => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }

      const userData = userDoc.data();
      return {
        ...userData,
        createdAt: new Date(userData.createdAt),
        updatedAt: new Date(userData.updatedAt),
      } as User;
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  // Sign out
  signOut: async (): Promise<void> => {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error(error.message);
    }
  },

  // Get current user
  getCurrentUser: (): FirebaseUser | null => {
    return auth.currentUser;
  },

  // Get user data from Firestore
  getUserData: async (userId: string): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();
      return {
        ...userData,
        createdAt: new Date(userData.createdAt),
        updatedAt: new Date(userData.updatedAt),
      } as User;
    } catch (error: any) {
      console.error('Error getting user data:', error);
      return null;
    }
  },
};
