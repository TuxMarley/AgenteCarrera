import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';
import { saveEvidenceFile } from '@/lib/evidence-storage';
const allowedTypes = new Set(['application/pdf','image/png','image/jpeg']);
const maxBytes = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const actor = await getActor(request); requireRole(actor, ['collaborator']); const form = await request.formData();
    const title = String(form.get('title') ?? '').trim(); const description = String(form.get('description') ?? '').trim(); const evidenceType = String(form.get('evidenceType') ?? 'achievement').trim(); const file = form.get('file');
    if (title.length < 3 || title.length > 120) return Response.json({ error:'El título debe tener entre 3 y 120 caracteres.' }, { status:400 });
    if (description.length > 1200) return Response.json({ error:'La descripción es demasiado extensa.' }, { status:400 });
    let objectKey:null|string=null, filename:null|string=null, contentType:null|string=null, size:null|number=null;
    if (file instanceof File && file.size > 0) {
      if (!allowedTypes.has(file.type) || file.size > maxBytes) return Response.json({ error:'Adjunta un PDF, PNG o JPG de hasta 10 MB.' }, { status:400 });
      objectKey=`evidence/${actor.id}/${crypto.randomUUID()}`; filename=file.name.slice(0,180); contentType=file.type; size=file.size;
      await saveEvidenceFile(objectKey, file, actor.id);
    }
    await ensureDatabase(); const id=crypto.randomUUID(); const createdAt=Date.now(); const db=rawDb();
    await db.batch([
      db.prepare(`INSERT INTO evidence (id, user_id, title, description, evidence_type, occurred_at, validation_status, object_key, original_filename, content_type, size_bytes, created_at) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`).bind(id,actor.id,title,description,evidenceType,createdAt,objectKey,filename,contentType,size,createdAt),
      db.prepare(`DELETE FROM profile_analyses WHERE user_id = ?`).bind(actor.id),
      db.prepare(`INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, after_json, created_at) VALUES (?, ?, ?, 'create', 'evidence', ?, ?, ?)`).bind(crypto.randomUUID(),actor.id,actor.id,id,JSON.stringify({title,evidenceType,hasFile:Boolean(objectKey)}),createdAt),
    ]);
    return Response.json({ id, status:'pending' }, { status:201 });
  } catch (error) { return apiError(error); }
}
