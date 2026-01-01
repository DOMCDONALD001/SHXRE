// One-off smoke test: create a sample post in `posts` collection and read it back.
// This script reads .env.development for FIREBASE_* variables, initializes firebase-admin
// and writes/reads a document. Run with: node scripts/smoke-create-post.js

const fs = require('fs');
const path = require('path');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const src = fs.readFileSync(filePath, 'utf8');
  const lines = src.split(/\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    let val = trimmed.slice(idx + 1);
    // strip surrounding quotes
    if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

(async () => {
  try {
    const envPath = path.resolve(process.cwd(), '.env.development');
    const env = parseEnv(envPath);

    const projectId = env.FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_PROJECT_ID;
    const clientEmail = env.FIREBASE_CLIENT_EMAIL;
    let privateKey = env.FIREBASE_PRIVATE_KEY;
    const databaseURL = env.FIREBASE_DATABASE_URL;

    if (!projectId || !clientEmail || !privateKey) {
      console.error('Missing FIREBASE_ADMIN credentials in .env.development (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)');
      process.exit(1);
    }

    // unescape newlines if needed
    privateKey = privateKey.replace(/\\n/g, '\n');

    const admin = require('firebase-admin');

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      }),
      databaseURL: databaseURL || undefined
    });

    const db = admin.firestore();

    console.log('Connected to Firestore project:', projectId);

    const sample = {
      text: 'Smoke test post from scripts/smoke-create-post.js',
      images: null,
      userLikes: [],
      createdBy: 'smoke-test',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: null,
      userReplies: 0,
      userRetweets: []
    };

    const docRef = await db.collection('posts').add(sample);
    console.log('Created test post with id:', docRef.id);

    // read it back
    const snap = await db.collection('posts').doc(docRef.id).get();
    if (!snap.exists) {
      console.error('Failed to read back test post');
      process.exit(2);
    }

    console.log('Read back document data:', snap.data());

    // cleanup: delete the test doc
    await db.collection('posts').doc(docRef.id).delete();
    console.log('Deleted test post. Smoke test complete.');

    // mark todo completed by exiting 0
    process.exit(0);
  } catch (err) {
    console.error('Smoke test failed:', err);
    process.exit(1);
  }
})();
