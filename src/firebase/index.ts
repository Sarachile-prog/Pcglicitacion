'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * PCG LICITACIÓN - ECOSISTEMA DE INTELIGENCIA 2026
 * Inicialización Singleton optimizada para Next.js (SSR + Cliente).
 */

const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const firestore: Firestore = getFirestore(app);

export { app as firebaseApp, auth, firestore };

export function initializeFirebase() {
  return { firebaseApp: app, auth, firestore };
}

// Exportaciones explícitas para componentes de Next.js
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
