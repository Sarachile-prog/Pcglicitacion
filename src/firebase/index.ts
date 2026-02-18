'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * PCG LICITACIÓN - ECOSISTEMA DE INTELIGENCIA 2026
 * Inicialización segura con patrón Singleton.
 * Evita colisiones de red y errores de despliegue en entornos Next.js.
 */

let app: FirebaseApp;

if (!getApps().length) {
  try {
    // Intentar inicialización para Firebase App Hosting
    app = initializeApp();
  } catch (e) {
    // Fallback a configuración manual segura
    app = initializeApp(firebaseConfig);
  }
} else {
  app = getApp();
}

export const firebaseApp = app;

export function initializeFirebase() {
  return getSdks(firebaseApp);
}

export function getSdks(instance: FirebaseApp) {
  return {
    firebaseApp: instance,
    auth: getAuth(instance),
    firestore: getFirestore(instance)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
