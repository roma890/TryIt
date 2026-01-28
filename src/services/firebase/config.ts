import { initializeApp, FirebaseApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCxJcKFS5vqwoxQ75oVtXlzskPcOXvqJTw',
  authDomain: 'foodswipe-297fe.firebaseapp.com',
  projectId: 'foodswipe-297fe',
  storageBucket: 'foodswipe-297fe.firebasestorage.app',
  messagingSenderId: '855171817860',
  appId: '1:855171817860:web:e4f2e5f63142e1926cbdd1',
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

export const initializeFirebase = () => {
  try {
    app = initializeApp(firebaseConfig);

    // Initialize Auth with AsyncStorage persistence for React Native
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });

    db = getFirestore(app);
    storage = getStorage(app);

    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
};

export { auth, db, storage };
export default app;
