// src/firebase.ts
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBKUSOSv4CbijaUbSvvZeCAIY29K_t4eFs",
  authDomain: "realtimealarm.firebaseapp.com",
  databaseURL: "https://realtimealarm-default-rtdb.firebaseio.com",
  projectId: "realtimealarm",
  storageBucket: "realtimealarm.firebasestorage.app",
  messagingSenderId: "502005117952",
  appId: "1:502005117952:web:0e90301fcd5f0b2da6d4e5",
  measurementId: "G-M3W6MQGKNF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getDatabase(app);
