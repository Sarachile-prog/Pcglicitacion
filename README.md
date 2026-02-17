
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

## Arquitectura de Seguridad (IMPORTANTE)

Este proyecto utiliza **Restricciones de API Key** en Google Cloud para evitar el robo de cuota de IA y base de datos.

### 403 Forbidden / Referer Blocked (Error de Registro/Login):
Si ves un error indicando que los requests desde un dominio están bloqueados, debes ir a [Google Cloud Console > API & Services > Credentials](https://console.cloud.google.com/apis/credentials) y añadir estos dominios a la lista blanca de tu API Key:

- `*.cloudworkstations.dev/*` (Obligatorio para que el editor de Firebase Studio funcione)
- `*.firebaseapp.com/*` (Obligatorio para previsualizaciones de Firebase)
- `*.web.app/*` (Alternativo)
- `pcglicitacion.cl/*` (Producción)
- `www.pcglicitacion.cl/*` (Producción)
- `localhost:9002/*` (Desarrollo local)

## Soporte
Cualquier duda técnica debe ser gestionada a través del módulo de **Mesa de Ayuda** interno en la plataforma.
