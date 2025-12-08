import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";

/**
 * Configuration object for Firebase, loaded from environment variables.
 * Contains keys for authentication, database URL, project ID, etc.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

/**
 * The initialized Firebase Application instance.
 * Undefined if initialization fails or configuration is missing.
 */
let app: FirebaseApp | undefined;

/**
 * The initialized Firebase Realtime Database instance.
 * Undefined if initialization fails or configuration is missing.
 */
let database: Database | undefined;

try {
    // Initialize if we have an API Key OR a Database URL
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
