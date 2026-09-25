import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';
import { saveEvidenceFile } from '@/lib/evidence-storage';
const allowedTypes = new Set(['application/pdf','image/png','image/jpeg']);
const maxBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const actor = await getActor(request); requireRole(actor, ['collaborator']); const form = await request.formData();
    const title = String(form.get('title') ?? '').trim(); const description = String(form.get('description') ?? '').trim(); const evidenceType = String(form.get('evidenceType') ?? 'achievement').trim(); const workActivityId = String(form.get('workActivityId') ?? '').trim(); const file = form.get('file');
    if (title.length < 3 || title.length > 120) return Response.json({ error:'El título debe tener entre 3 y 120 caracteres.' }, { status:400 });
    if (description.length < 10 || description.length > 1200) return Response.json({ error:'Describe el avance en 10 a 1200 caracteres.' }, { status:400 });
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(workActivityId)) return Response.json({ error:'Selecciona una tarea válida para asociar la evidencia.' }, { status:400 });
    if (!(file instanceof File) || file.size === 0) return Response.json({ error:'Adjunta un archivo concreto antes de registrar la evidencia.' }, { status:400 });
    if (!allowedTypes.has(file.type) || file.size > maxBytes) return Response.json({ error:'Adjunta un PDF, PNG o JPG de hasta 10 MB.' }, { status:400 });

    await ensureDatabase(); const db=rawDb();
    const activity = await db.prepare(`SELECT id FROM work_activities WHERE id = ? AND user_id = ?`).bind(workActivityId, actor.id).first<{ id:string }>();
    if (!activity) return Response.json({ error:'No encontramos la tarea seleccionada.' }, { status:404 });
    const id=crypto.randomUUID(); const createdAt=Date.now(); const objectKey=`evidence/${actor.id}/${crypto.randomUUID()}`; const filename=file.name.slice(0,180); const contentType=file.type; const size=file.size;
    await saveEvidenceFile(objectKey, file, actor.id);
    await db.batch([
      db.prepare(`INSERT INTO evidence (id, user_id, title, description, evidence_type, occurred_at, validation_status, work_activity_id, object_key, original_filename, content_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)`).bind(id,actor.id,title,description,evidenceType,createdAt,workActivityId,objectKey,filename,contentType,size,createdAt),
      db.prepare(`UPDATE work_activities SET validation_status = 'pending_review', submitted_for_review = 0, reviewed_by = NULL, reviewed_at = NULL, updated_at = ? WHERE id = ? AND user_id = ?`).bind(createdAt, workActivityId, actor.id),
      db.prepare(`DELETE FROM profile_analyses WHERE user_id = ?`).bind(actor.id),
      db.prepare(`INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, after_json, created_at) VALUES (?, ?, ?, 'create', 'evidence', ?, ?, ?)`).bind(crypto.randomUUID(),actor.id,actor.id,id,JSON.stringify({title,evidenceType,workActivityId,hasFile:true}),createdAt),
    ]);
    return Response.json({ id, workActivityId, status:'draft' }, { status:201 });
  } catch (error) { return apiError(error); }
}
