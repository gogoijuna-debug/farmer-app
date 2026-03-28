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
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAmctTpt5Lt95NJHqinnOsV5C6SODjeZjg",
  authDomain: "sanjivani-vet-care.firebaseapp.com",
  projectId: "sanjivani-vet-care",
  storageBucket: "sanjivani-vet-care.firebasestorage.app",
  messagingSenderId: "101078063223",
  appId: "1:101078063223:web:512a75bb397cfd179bce72",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let auth: Auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
