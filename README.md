# Evoluciona — versión para Netlify

Esta carpeta es una copia independiente de la aplicación original. Conserva la interfaz y los flujos funcionales, pero reemplaza los servicios exclusivos de OpenAI Sites y Cloudflare por componentes compatibles con Netlify:

- Next.js nativo para el frontend y las rutas API.
- Netlify Database (PostgreSQL) para datos persistentes y ramas de base por despliegue.
- Netlify Blobs para los archivos privados de evidencia.
- Modo demostrativo configurable mientras se integra un proveedor de identidad real.

## Desarrollo local

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Para conectar la base durante el desarrollo local utiliza `netlify dev` después de vincular el proyecto con Netlify. Los adjuntos locales se guardan en `.data/files` cuando ejecutas `next dev`; ese directorio está ignorado por Git.

## Variables de entorno en Netlify

Configura estas variables desde **Site configuration > Environment variables**:

| Variable | Uso |
| --- | --- |
| `OPENAI_API_KEY` | Secreto del servidor para los dos flujos de IA. |
| `OPENAI_MODEL` | Modelo de OpenAI; valor sugerido: `gpt-5.6-terra`. |
| `DEMO_MODE` | Usa `true` para habilitar las identidades demostrativas del servidor. |
| `NEXT_PUBLIC_DEMO_MODE` | Usa `true` para mostrar el selector de perfil vacío en la demo. |

`OPENAI_API_KEY` nunca debe llevar el prefijo `NEXT_PUBLIC_`.

## Despliegue

1. Crea un repositorio de GitHub usando el contenido de esta carpeta como raíz.
2. En **Data & storage > Database**, crea la Netlify Database para el sitio. No debes copiar una URL ni un token: `@netlify/database` resuelve la conexión correcta en cada entorno.
3. Importa el repositorio desde Netlify. `netlify.toml` ejecutará `npm run build` y publicará `.next` mediante el runtime de Next.js de Netlify.
4. Configura las variables anteriores y despliega. Netlify aplica automáticamente las migraciones de `netlify/database/migrations` antes de publicar.
5. Verifica que aparezca el perfil ficticio de Javiera Pérez, con tareas, evidencias y orientación inicial.

Netlify Blobs obtiene automáticamente el contexto del sitio durante la ejecución en Netlify; no requiere credenciales adicionales en la aplicación.

## Advertencia del modo demo

`DEMO_MODE=true` expone las identidades ficticias mediante encabezados de demostración. Es apropiado únicamente para esta muestra. Antes de incorporar personas o datos reales, configura autenticación, cambia `DEMO_MODE` y `NEXT_PUBLIC_DEMO_MODE` a `false`, y conserva las comprobaciones de roles del servidor.

## Arquitectura migrada

La capa `db/runtime.ts` adapta la interfaz utilizada originalmente con D1 a PostgreSQL mediante `@netlify/database`, por lo que las rutas API y la trazabilidad se mantienen. El esquema y los datos ficticios están versionados en `netlify/database/migrations`, que Netlify aplica automáticamente. `lib/evidence-storage.ts` usa Netlify Blobs en producción y almacenamiento local ignorado por Git durante el desarrollo. Los documentos RAG no se suben ni se envían completos al modelo: la aplicación continúa utilizando los criterios normalizados en el código.
