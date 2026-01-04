// Creates a news-bot user in Firebase Auth and Firestore.
// Requires these env vars to be set:
// FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID
// Optionally set NEWS_BOT_UID (defaults to the hardcoded id below)

const admin = require('firebase-admin');

const BOT_UID = process.env.NEWS_BOT_UID || 'uo4MJ6LH1paglmrfTOI7PxIFOmz2';

function initAdmin() {
  if (admin.apps && admin.apps.length) return admin;

  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PROJECT_ID) {
    console.error('Missing Firebase admin envs. Set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // support escaped newlines
      privateKey: privateKey.replace(/\\n/g, '\n')
    })
  });

  return admin;
}

async function createBot() {
  const adminLib = initAdmin();
  try {
    // Ensure auth user exists
    let userRecord;
    try {
      userRecord = await adminLib.auth().getUser(BOT_UID);
      console.log('Auth user already exists:', BOT_UID);
    } catch (err) {
      console.log('Creating auth user', BOT_UID);
      userRecord = await adminLib.auth().createUser({
        uid: BOT_UID,
        displayName: 'SHXRE News',
        photoURL: 'https://shxre.net/assets/shxre-avatar.png'
      });
      console.log('Created auth user', userRecord.uid);
    }

    // Create Firestore user document
    const db = adminLib.firestore();
    const userRef = db.collection('users').doc(BOT_UID);
    const snap = await userRef.get();
    if (snap.exists) {
      console.log('Firestore user doc already exists for', BOT_UID);
    } else {
      await userRef.set({
        id: BOT_UID,
        username: 'shxre_news',
        name: 'SHXRE News',
        bio: 'Automated news feed — headlines only',
        avatar: '/assets/shxre-avatar.png',
        createdAt: adminLib.firestore.FieldValue.serverTimestamp(),
        followersCount: 0,
        followingCount: 0,
        isBot: true
      });
      console.log('Created Firestore user doc for', BOT_UID);
    }

    console.log('Done. News-bot UID:', BOT_UID);
    process.exit(0);
  } catch (err) {
    console.error('Failed to create news-bot:', err);
    process.exit(1);
  }
}

createBot();
