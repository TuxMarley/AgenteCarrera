import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getUserByIdentity } from '@/db/repository';

export type AppRole = 'collaborator' | 'leader' | 'admin';
export type Actor = { id: string; role: AppRole; email: string; fullName: string };
export class AccessError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function getActor(request?: Request): Promise<Actor> {
  const identity = await getChatGPTUser();
  if (!identity) {
    if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
      const demoRole = request?.headers.get('x-demo-role');
      if (demoRole === 'leader') return { id:'usr_marcelo', role:'leader', email:'marcelo.soto@example.com', fullName:'Marcelo Soto' };
      if (demoRole === 'admin') return { id:'usr_admin', role:'admin', email:'personas@example.com', fullName:'Equipo de Personas' };
      if (request?.headers.get('x-demo-profile') === 'empty') return { id:'usr_empty_collaborator', role:'collaborator', email:'empty.collaborator@example.com', fullName:'Perfil inicial' };
      return { id:'usr_javiera', role:'collaborator', email:'javiera.perez@example.com', fullName:'Javiera Pérez' };
    }
    throw new AccessError(401, 'Debes iniciar sesión.');
  }
  const user = await getUserByIdentity(identity.userId, identity.email);
  if (!user) throw new AccessError(403, 'Tu cuenta todavía no está habilitada para este piloto.');
  return { id:user.id, role:user.role, email:user.email, fullName:user.fullName };
}
export function requireRole(actor: Actor, allowed: AppRole[]) { if (!allowed.includes(actor.role)) throw new AccessError(403, 'No tienes permisos para realizar esta acción.'); }
export function apiError(error: unknown) {
  if (error instanceof AccessError) return Response.json({ error:error.message }, { status:error.status });
  console.error(error); return Response.json({ error:'No fue posible completar la solicitud.' }, { status:500 });
}
