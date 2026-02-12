import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBvQrOoYnRhKTzNdUjQhDGJmJXQqXqXqXq",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "route-test-fe6fc.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "route-test-fe6fc",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "route-test-fe6fc.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789012:web:abcdefghijklmnop"
};

// Firebase 앱 초기화 (서버사이드 전용)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firestore 및 Storage (Server-side only)
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
