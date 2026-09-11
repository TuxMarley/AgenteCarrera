import { ensureDatabase, rawDb } from '@/db/runtime';
import { apiError, getActor, requireRole } from '@/lib/authz';
export async function POST(request: Request, context: { params: Promise<{ id:string }> }) {
  try {
    const actor=await getActor(request); requireRole(actor,['leader','admin']); const { id }=await context.params; const body=await request.json() as {decision?:string;feedback?:string};
    const status=body.decision==='approve'?'approved':body.decision==='changes'?'changes_requested':null;
    if(!status) return Response.json({error:'Decisión inválida.'},{status:400}); await ensureDatabase(); const db=rawDb();
    const current=await db.prepare(`SELECT id, user_id AS userId, status FROM action_items WHERE id = ?`).bind(id).first<{id:string;userId:string;status:string}>();
    if (current && actor.role === 'leader') {
      const owner = await db.prepare(`SELECT manager_id AS managerId FROM users WHERE id = ?`).bind(current.userId).first<{ managerId:string|null }>();
      if (owner?.managerId !== actor.id) return Response.json({error:'No tienes permisos sobre el plan de esta persona.'},{status:403});
    }
    if(!current) return Response.json({error:'Acción no encontrada.'},{status:404}); const updatedAt=Date.now();
    await db.batch([
      db.prepare(`UPDATE action_items SET status = ?, leader_feedback = ?, updated_at = ? WHERE id = ?`).bind(status,String(body.feedback??'').slice(0,1200),updatedAt,id),
      db.prepare(`INSERT INTO audit_log (id, actor_id, target_user_id, action, entity_type, entity_id, before_json, after_json, created_at) VALUES (?, ?, ?, 'review', 'action_item', ?, ?, ?, ?)`).bind(crypto.randomUUID(),actor.id,current.userId,id,JSON.stringify({status:current.status}),JSON.stringify({status,feedback:body.feedback??''}),updatedAt),
    ]);
    return Response.json({id,status});
  } catch(error){ return apiError(error); }
}
