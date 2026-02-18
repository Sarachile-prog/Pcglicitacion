'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * PCG LICITACIÓN - ECOSISTEMA DE INTELIGENCIA 2026
 * Inicialización Singleton Definitiva para evitar bloqueos en Publishing.
 */

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

if (typeof window !== 'undefined') {
  // Lógica de cliente: Garantizar instancia única
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  firestore = getFirestore(app);
} else {
  // Lógica de servidor (SSR): Inicialización mínima
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

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
