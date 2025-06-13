require('dotenv').config();
const admin = require("firebase-admin");

// ✅ Read JSON string from env and parse it
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "appointment-deb6a.appspot.com",
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { db, bucket };
