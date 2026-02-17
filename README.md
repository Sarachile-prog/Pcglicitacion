
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

## Solución de Errores de Git (Autenticación)

Si al hacer `git push` recibes el error **"Missing or invalid credentials"** o **"Authentication failed"**, sigue estos pasos:

1. **Configurar persistencia:** Ejecuta en la terminal:
   `git config --global credential.helper store`

2. **Generar un Token en GitHub:**
   - Ve a [GitHub Settings > Developer Settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens).
   - Genera un nuevo token con permisos de `repo`.
   - **Copia el token** (no lo pierdas).

3. **Reintentar el Push:**
   - Ejecuta `git push origin main`.
   - **Username:** Tu nombre de usuario de GitHub.
   - **Password:** Pega el **Token** que generaste (no uses tu contraseña de login).

## Arquitectura de Seguridad (IMPORTANTE)

Este proyecto utiliza **Restricciones de API Key** en Google Cloud para evitar el robo de cuota de IA y base de datos.

### 403 Forbidden / Referer Blocked (Error de Registro/Login):
Si ves un error indicando que los requests desde un dominio están bloqueados, debes ir a [Google Cloud Console > API & Services > Credentials](https://console.cloud.google.com/apis/credentials) y editar la clave **"Browser key (auto created by Firebase)"**. 

**Añade estos dominios a la lista blanca obligatoriamente:**

1. `*.cloudworkstations.dev/*` (REQUERIDO para el editor de Firebase Studio)
2. `*.firebaseapp.com/*` (Requerido para previsualizaciones de Firebase)
3. `*.web.app/*`
4. `pcglicitacion.cl/*`
5. `www.pcglicitacion.cl/*`
6. `localhost:9002/*`

## Soporte
Cualquier duda técnica debe ser gestionada a través del módulo de **Mesa de Ayuda** interno en la plataforma.
