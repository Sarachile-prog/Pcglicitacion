'use client';

import { useState, useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Componente que escucha errores de permisos.
 * HEMOS ELIMINADO EL 'throw error' para evitar el colapso global (Pantalla Blanca).
 * Los componentes individuales ahora manejan sus propios estados de error.
 */
export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      console.warn('>>> [FIREBASE_PERMISSION_DENIED]:', error.request.path, error.request.method);
      setError(error);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  // Ya no lanzamos el error al árbol de React para evitar el Crash global.
  return null;
}
