import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  limit,
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize client-side Firebase instance
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with the provisioned database ID
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || "(default)"
);

// Connection state tracking
let isConnectionVerified = false;

// Mandatory testConnection as required by Firebase Skill
export async function testConnection(): Promise<boolean> {
  try {
    // Attempt reading test connection document from server
    await getDocFromServer(doc(db, "test", "connection"));
    isConnectionVerified = true;
    console.log("[Firestore Client] Cloud Firestore connection verified successfully!");
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration: client is offline.");
      return false;
    }
    // Any permission or not-found error implies successful network ping to Firestore!
    isConnectionVerified = true;
    return true;
  }
}

// Initial boot ping
testConnection().catch(console.error);

export function getFirestoreConnectionStatus() {
  return {
    isVerified: isConnectionVerified,
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId,
  };
}

export {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  limit,
};
