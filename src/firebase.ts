// src/firebase.ts
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

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
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getDatabase(app);

// Initialize Firebase Cloud Messaging
export const messaging = typeof window !== 'undefined' && 'serviceWorker' in navigator ? getMessaging(app) : null;

export const requestForToken = async () => {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const swRegistration = await navigator.serviceWorker.ready;
      const currentToken = await getToken(messaging, {
        vapidKey: 'BK3JKNPPNxnougtbD5HJocf3v_g7PTsm4Bgpnvz1KY3UhB1ariEmA5yP4-QJou98J7jhovlx44GebNs32fBDHyw',
        serviceWorkerRegistration: swRegistration
      });
      if (currentToken) {
        console.log('Firebase Token:', currentToken);
        return currentToken;
      } else {
        console.log('No registration token available.');
      }
    } else {
      console.log('Notification permission denied.');
    }
  } catch (error) {
    console.error('An error occurred while retrieving token.', error);
  }
  return null;
};

export const onMessageListener = () => {
  if (!messaging) return new Promise(() => {});
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
};
