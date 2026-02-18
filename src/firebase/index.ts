'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * PCG LICITACIÓN - ECOSISTEMA DE INTELIGENCIA 2026
 * Punto de entrada central con exportaciones explícitas para evitar errores de compilación.
 */

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  firestore = getFirestore(app);
} else {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  firestore = getFirestore(app);
}

export { app as firebaseApp, auth, firestore };

export function initializeFirebase() {
  return { firebaseApp: app, auth, firestore };
}

// Exportaciones explícitas para evitar errores de "Export not found" en Next.js
export { 
  FirebaseProvider, 
  useFirebase, 
  useAuth, 
  useFirestore, 
  useFirebaseApp, 
  useMemoFirebase, 
  useUser 
} from './provider';

export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
