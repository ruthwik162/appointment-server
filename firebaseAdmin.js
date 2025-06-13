require('dotenv').config();
const admin = require("firebase-admin");

// ✅ Only this is needed
const serviceAccount = require(process.env.SERVICE_ACCOUNT_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "appointment-deb6a.appspot.com",
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

module.exports = { db, bucket };
