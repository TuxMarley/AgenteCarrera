import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor } from '@/lib/authz';
import { readEvidenceFile } from '@/lib/evidence-storage';

export async function GET(request: Request, context: { params: Promise<{ id:string }> }) {
  try {
    const actor = await getActor(request);
    const { id } = await context.params;
    await ensureDatabase();
    const evidence = await rawDb().prepare(`SELECT evidence.user_id AS userId, evidence.object_key AS objectKey, evidence.original_filename AS originalFilename, evidence.content_type AS contentType, user.manager_id AS managerId FROM evidence JOIN users user ON user.id = evidence.user_id WHERE evidence.id = ?`).bind(id).first<{ userId:string; objectKey:string|null; originalFilename:string|null; contentType:string|null; managerId:string|null }>();
    if (!evidence?.objectKey) return Response.json({ error:'Esta evidencia no tiene un archivo adjunto disponible.' }, { status:404 });
    const permitted = actor.role === 'admin' || actor.id === evidence.userId || (actor.role === 'leader' && evidence.managerId === actor.id);
    if (!permitted) return Response.json({ error:'No tienes permisos para acceder a este archivo.' }, { status:403 });

    const object = await readEvidenceFile(evidence.objectKey);
    if (!object) return Response.json({ error:'El archivo no está disponible.' }, { status:404 });
    const filename = encodeURIComponent(evidence.originalFilename || 'evidencia');
    return new Response(object, { headers:{ 'Content-Type':evidence.contentType || 'application/octet-stream', 'Content-Disposition':`inline; filename*=UTF-8''${filename}`, 'Cache-Control':'private, no-store' } });
  } catch (error) { return apiError(error); }
}
