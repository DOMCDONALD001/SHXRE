import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { isUsingEmulator } from '@lib/env';
import { getFirebaseConfig } from './config';
import type { Auth } from 'firebase/auth';
import type { Functions } from 'firebase/functions';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseApp } from 'firebase/app';
import type { FirebaseStorage } from 'firebase/storage';

type Firebase = {
  auth: Auth;
  storage: FirebaseStorage;
  firestore: Firestore;
  functions: Functions;
  firebaseApp: FirebaseApp;
};

function initialize(): Firebase {
  const firebaseApp = initializeApp(getFirebaseConfig());

  const auth = getAuth(firebaseApp);
  const storage = getStorage(firebaseApp);
  const firestore = getFirestore(firebaseApp);
  const functions = getFunctions(firebaseApp);

  // Enable persistence only in the browser environment
  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(firestore).catch((err) => {
      // Common cases: failed-precondition (multiple tabs) or unimplemented (browser not supported)
      console.warn('Firestore persistence not enabled:', err?.code || err?.message || err);
    });
  }

  return { firebaseApp, auth, firestore, storage, functions };
}

function connectToEmulator({
  auth,
  storage,
  firestore,
  functions,
  firebaseApp
}: Firebase): Firebase {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectStorageEmulator(storage, 'localhost', 9199);
  connectFirestoreEmulator(firestore, 'localhost', 8080);
  connectFunctionsEmulator(functions, 'localhost', 5001);

  return { firebaseApp, auth, firestore, storage, functions };
}

export function getFirebase(): Firebase {
  try {
    const firebase = initialize();

    if (isUsingEmulator) return connectToEmulator(firebase);

    return firebase;
  } catch (err) {
    // Don't fail the entire build when Firebase env is missing during CI/build.
    // Return a safe stub that will surface runtime errors only when used.
    console.warn('Failed to initialize Firebase (returning stub):', err);
    const stub: Firebase = {
      firebaseApp: {} as unknown as FirebaseApp,
      auth: {} as unknown as Auth,
      firestore: {} as unknown as Firestore,
      storage: {} as unknown as FirebaseStorage,
      functions: {} as unknown as Functions
    };

    return stub;
  }
}

export const { firestore: db, auth, storage } = getFirebase();
