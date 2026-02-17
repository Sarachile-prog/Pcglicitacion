'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Componente silenciado para evitar colapsos globales (White Screens).
 * Las notificaciones de error ahora se manejan a nivel de componente individual.
 */
export function FirebaseErrorListener() {
  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Solo registramos el error en consola para debugging sin romper la UI
      console.warn('>>> [FIREBASE_PERMISSIONS]: Acceso denegado en', error.request.path);
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  return null;
}