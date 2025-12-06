import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp | undefined;
let database: Database | undefined;

try {
    // Only initialize if we have at least an API key or Database URL
    if (firebaseConfig.apiKey || firebaseConfig.databaseURL) {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        database = getDatabase(app);
    } else {
        console.warn("Firebase config is missing. App will run in demo mode (UI only).");
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

export { app, database };
