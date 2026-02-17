
# PCG LICITACIÓN - Guía de Operación

Este es el repositorio central del ecosistema de inteligencia para Mercado Público.

## Comandos de Desarrollo

- `npm run dev`: Inicia el servidor local en el puerto 9002.
- `npm run build`: Prepara la aplicación para producción.

## Gestión de Cambios (Git)

Para subir tus cambios a GitHub de forma segura:

1. **Preparar archivos:**
   ```bash
   git add .
   ```

2. **Crear punto de control (Local):**
   ```bash
   git commit -m "Descripción clara de tus cambios"
   ```

3. **Subir a la nube (GitHub):**
   ```bash
   git push origin main
   ```

### ¿Cómo saber si el push fue exitoso?
Ejecuta `git status`. 

- **ÉXITO:** Si dice `Your branch is up to date with 'origin/main'`, tus cambios ya están en la nube.
- **PENDIENTE:** Si dice `Your branch is ahead of 'origin/main' by X commits`, significa que hiciste el commit pero **te faltó el push**. Ejecuta `git push origin main`.

## Arquitectura de Seguridad

Este proyecto utiliza **Variables de Envío** para las llaves de Firebase. Asegúrate de configurar las restricciones de dominio en la consola de Google Cloud para:
- `pcglicitacion.cl`
- `studio.firebase.google.com` (para desarrollo en el editor)

## Soporte
Cualquier duda técnica debe ser gestionada a través del módulo de **Mesa de Ayuda** interno en la plataforma.
