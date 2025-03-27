import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyD8SpB95WW4IkWler32tXJ7zHCv1OC3bZo",
  authDomain: "attendance-edc45.firebaseapp.com",
  projectId: "attendance-edc45",
  storageBucket: "attendance-edc45.firebasestorage.app",
  messagingSenderId: "674038211843",
  appId: "1:674038211843:web:d39dea4153523cfa6e7536",
  measurementId: "G-K56TQG6CBB"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app); 