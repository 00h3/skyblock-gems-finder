import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

import appletConfigRaw from "../firebase-applet-config.json";

const appletConfig: Record<string, string> = appletConfigRaw || {};

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: "",
};

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    import.meta.env.VITE_GOOGLE_API_KEY ||
    appletConfig.apiKey ||
    DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    appletConfig.authDomain ||
    DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    appletConfig.projectId ||
    DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    appletConfig.storageBucket ||
    DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    appletConfig.messagingSenderId ||
    DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId || DEFAULT_FIREBASE_CONFIG.appId,
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ||
    appletConfig.measurementId ||
    DEFAULT_FIREBASE_CONFIG.measurementId,
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
const customDatabaseId =
  appletConfig.firestoreDatabaseId && appletConfig.firestoreDatabaseId !== "(default)"
    ? appletConfig.firestoreDatabaseId
    : undefined;

// Dev-server HMR and SSR re-evaluate this module against the same app
// instance; initializeFirestore throws on the second call, so reuse it.
function createDb() {
  try {
    return initializeFirestore(
      app,
      typeof window !== "undefined" ? { localCache: persistentLocalCache({}) } : {},
      customDatabaseId,
    );
  } catch {
    return customDatabaseId ? getFirestore(app, customDatabaseId) : getFirestore(app);
  }
}
export const db = createDb();
export const storage = getStorage(app);

// Analytics — browser only (SSR guard)
if (typeof window !== "undefined") {
  import("firebase/analytics")
    .then(({ getAnalytics }) => {
      getAnalytics(app);
    })
    .catch(() => {});
}
