// Polyfill for WeakRef / FinalizationRegistry (Required for Firebase 11+ on Hermes)
if (typeof (global as any).WeakRef === 'undefined') {
  (global as any).WeakRef = class {
    constructor(val: any) { (this as any).val = val; }
    deref() { return (this as any).val; }
  };
}
if (typeof (global as any).FinalizationRegistry === 'undefined') {
  (global as any).FinalizationRegistry = class {
    register() {}
    unregister() {}
  };
}

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAmctTpt5Lt95NJHqinnOsV5C6SODjeZjg",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "sanjivani-vet-care.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "sanjivani-vet-care",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "sanjivani-vet-care.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "101078063223",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:101078063223:web:512a75bb397cfd179bce72"
};

if (!firebaseConfig.apiKey) {
  throw new Error("Firebase API Key is missing. Check your .env file or build process.");
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence for React Native
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (e) {
  auth = getAuth(app);
}
const db = getFirestore(app);

export { auth, db };
