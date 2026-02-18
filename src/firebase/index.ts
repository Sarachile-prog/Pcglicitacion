'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

/**
 * PCG LICITACIÓN - ECOSISTEMA DE INTELIGENCIA 2026
 * Inicialización de nivel de módulo para prevenir colisiones en Publishing.
 * Este patrón asegura que initializeApp() se ejecute una sola vez.
 */

let app: FirebaseApp;

if (!getApps().length) {
  try {
    // 1. Intentar inicialización automática (Firebase App Hosting)
    // Esto es preferible en entornos de producción.
    app = initializeApp();
  } catch (e) {
    // 2. Fallback a configuración manual (Desarrollo / Entornos Locales)
    if (process.env.NODE_ENV === "production") {
      console.warn('PCG: Fallback a firebaseConfig detectado en producción.');
    }
    app = initializeApp(firebaseConfig);
  }
} else {
  // 3. Reutilizar la instancia existente si ya fue creada
  app = getApp();
}

export const firebaseApp = app;

/**
 * Función para obtener los SDKs inicializados.
 * Utilizada por el FirebaseProvider para inyectar servicios en el árbol de React.
 */
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
