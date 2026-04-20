import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Analytics (optional, handled gracefully)
export const analytics = isSupported().then(yes => yes ? getAnalytics(app) : null);

export const auth = getAuth(app);

// Use defined databaseId or default to the primary database
const dbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = dbId && dbId !== '(default)' ? getFirestore(app, dbId) : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Optional: Connection check that doesn't throw aggressive "offline" errors
if (process.env.NODE_ENV !== 'production') {
  console.log("Firebase initialized for project:", firebaseConfig.projectId);
}
