# Evoluciona — versión para Netlify

Esta carpeta es una copia independiente de la aplicación original. Conserva la interfaz y los flujos funcionales, pero reemplaza los servicios exclusivos de OpenAI Sites y Cloudflare por componentes compatibles con Netlify:

- Next.js nativo para el frontend y las rutas API.
- Turso/libSQL para la base de datos SQLite persistente.
- Netlify Blobs para los archivos privados de evidencia.
- Modo demostrativo configurable mientras se integra un proveedor de identidad real.

## Desarrollo local

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Sin `TURSO_DATABASE_URL`, el desarrollo local utiliza `.data/career-agent.db`. Los adjuntos locales se guardan en `.data/files`; ambos directorios están ignorados por Git.

## Variables de entorno en Netlify

Configura estas variables desde **Site configuration > Environment variables**:

| Variable | Uso |
| --- | --- |
| `TURSO_DATABASE_URL` | URL `libsql://` de la base persistente. Obligatoria en producción. |
| `TURSO_AUTH_TOKEN` | Token de acceso a Turso. |
| `OPENAI_API_KEY` | Secreto del servidor para los dos flujos de IA. |
| `OPENAI_MODEL` | Modelo de OpenAI; valor sugerido: `gpt-5.6-terra`. |
| `DEMO_MODE` | Usa `true` para habilitar las identidades demostrativas del servidor. |
| `NEXT_PUBLIC_DEMO_MODE` | Usa `true` para mostrar el selector de perfil vacío en la demo. |

`OPENAI_API_KEY` y `TURSO_AUTH_TOKEN` nunca deben llevar el prefijo `NEXT_PUBLIC_`.

## Despliegue

1. Crea un repositorio de GitHub usando el contenido de esta carpeta como raíz.
2. Crea una base Turso y configura su URL y token en Netlify.
3. Importa el repositorio desde Netlify. `netlify.toml` ejecutará `npm run build` y publicará `.next` mediante el runtime de Next.js de Netlify.
4. Configura las variables anteriores y despliega.
5. Verifica perfil, tareas, evidencias, descarga privada, chat y análisis de perfil.

Netlify Blobs obtiene automáticamente el contexto del sitio durante la ejecución en Netlify; no requiere credenciales adicionales en la aplicación.

## Advertencia del modo demo

`DEMO_MODE=true` expone las identidades ficticias mediante encabezados de demostración. Es apropiado únicamente para esta muestra. Antes de incorporar personas o datos reales, configura autenticación, cambia `DEMO_MODE` y `NEXT_PUBLIC_DEMO_MODE` a `false`, y conserva las comprobaciones de roles del servidor.

## Arquitectura migrada

La capa `db/runtime.ts` adapta la interfaz utilizada originalmente con D1 a libSQL, por lo que las rutas API y la trazabilidad se mantienen. `lib/evidence-storage.ts` usa Netlify Blobs en producción y almacenamiento local ignorado por Git durante el desarrollo. Los documentos RAG no se suben ni se envían completos al modelo: la aplicación continúa utilizando los criterios normalizados en el código.
