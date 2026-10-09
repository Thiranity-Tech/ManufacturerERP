// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC44e8v9ONPu05HPueVVKAx2fIRg2d2uj8",
  authDomain: "erpbymv.firebaseapp.com",
  projectId: "erpbymv",
  storageBucket: "erpbymv.firebasestorage.app",
  messagingSenderId: "841373958100",
  appId: "1:841373958100:web:304b6a847337a7ccf3e041",
  measurementId: "G-XELVHTH931"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore Database & Export
export const db = getFirestore(app);