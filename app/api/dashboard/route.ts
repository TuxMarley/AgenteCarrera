import { getDashboard } from '@/db/repository';
import { apiError, getActor } from '@/lib/authz';
export async function GET(request: Request) {
  try { const actor = await getActor(request); return Response.json(await getDashboard(actor.role === 'collaborator' ? actor.id : 'usr_javiera', actor.role !== 'collaborator')); }
  catch (error) { return apiError(error); }
}
