// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: 'AIzaSyC-VY_suKrYVSvgCp3hou0rTnxmR6mWCLs',
  authDomain: 'personal-command-center-596e2.firebaseapp.com',
  projectId: 'personal-command-center-596e2',
  storageBucket: 'personal-command-center-596e2.firebasestorage.app',
  messagingSenderId: '189330523271',
  appId: '1:189330523271:web:c12358e0effc1750876422',
  measurementId: 'G-RKV62HXKM7',
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
