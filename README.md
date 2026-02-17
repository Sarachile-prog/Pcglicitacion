
# PCG LICITACIÓN - Guía de Operación

Este es el repositorio central del ecosistema de inteligencia para Mercado Público.

## Comandos de Desarrollo

- `npm run dev`: Inicia el servidor local en el puerto 9002.
- `npm run build`: Prepara la aplicación para producción.

## Gestión de Cambios (Git)

Para subir tus cambios a GitHub de forma segura:

1. **Preparar archivos:** `git add .`
2. **Crear punto de control (Local):** `git commit -m "Descripción clara"`
3. **Subir a la nube (GitHub):** `git push origin main`

### ¿Cómo saber si el push fue exitoso?
Ejecuta `git status` o mira el log con `git log -1`. 

- **ÉXITO:** Si en el log ves `(HEAD -> main, origin/main)`, tus cambios ya están en la nube.
- **PENDIENTE:** Si `git status` dice `Your branch is ahead of 'origin/main'`, ejecuta `git push origin main`.

## Arquitectura de Seguridad

Este proyecto utiliza **Restricciones de API Key** en Google Cloud. 
**IMPORTANTE:** Si ves errores de "Insufficient Permissions" o "Referer Blocked" en el editor de Firebase Studio, asegúrate de que en la consola de Google Cloud, la clave de API tenga permitidos los siguientes dominios:

### Dominios Requeridos:
- `pcglicitacion.cl/*` (Producción)
- `www.pcglicitacion.cl/*` (Producción)
- `localhost:9002/*` (Desarrollo local)
- `studio-4126028826-31b2f.firebaseapp.com/*` (Dominio de Firebase Studio - ¡Vital para que el editor funcione!)
- `studio-4126028826-31b2f.web.app/*` (Dominio alternativo de Studio)

## Soporte
Cualquier duda técnica debe ser gestionada a través del módulo de **Mesa de Ayuda** interno en la plataforma.
