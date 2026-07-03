import { initializeApp } from "firebase/app";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCeQn1qSNUqMgqwIQ3XTriUSkCna1waWS0",
  authDomain: "gen-lang-client-0874003810.firebaseapp.com",
  projectId: "gen-lang-client-0874003810",
  storageBucket: "gen-lang-client-0874003810.firebasestorage.app",
  messagingSenderId: "898206840333",
  appId: "1:898206840333:web:cf8908f70b0cd9f6290744"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom database ID and long polling enabled to prevent iframe websocket / connection issues
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, "ai-studio-5charactercodech-da07e20a-237a-45e4-9837-43665a7bf966");
