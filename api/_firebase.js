const admin = require('firebase-admin');

// 1. Check if ENV variables are properly loaded (Prevents silent crashes)
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
    console.error("FIREBASE CREDENTIALS MISSING! Please check Vercel Environment Variables.");
}

// 2. Initialize Firebase Admin safely
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Vercel me private key newlines issue fix
        privateKey: process.env.FIREBASE_PRIVATE_KEY 
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
            : undefined,
      }),
    });
    console.log("Firebase Admin initialized successfully.");
  } catch (error) {
    console.error("Firebase initialization error:", error);
  }
}

const db = admin.firestore();
module.exports = { admin, db };
