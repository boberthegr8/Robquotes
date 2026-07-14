import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDp_P4jLyWC5Itd7bQ_En8JhP1dqBdoemA",
  authDomain: "great-white-streams.firebaseapp.com",
  projectId: "great-white-streams",
  storageBucket: "great-white-streams.firebasestorage.app",
  messagingSenderId: "840095318140",
  appId: "1:840095318140:web:6338a4e128ae0bcc8209f9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the specific custom database ID
const db = getFirestore(app, "ai-studio-forgeestimatingm-e15eb413-014f-4b07-bc9b-775aa3a391c9");

// Validate Connection to Firestore (As mandated in firestore-skill)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'projects', 'test-connection-probe'));
    console.log("Firebase Firestore successfully reached.");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.");
    }
  }
}
testConnection();

export { app, db };
