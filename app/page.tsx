'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Bot,
  Check,
  ClipboardCheck,
  Compass,
  FileText,
  History,
  House,
  Layers3,
  Map,
  MoreHorizontal,
  Send,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { CAREER_MODEL_VERSION, careerFamilies, getCareerRoleSelectionByLabel, getNextRole } from '@/lib/career-roles';

type Profile = {
  id:string;
  fullName:string;
  currentJobRole:string|null;
  workContext:string|null;
  developmentGoal:string|null;
  profileCompleted:boolean;
  validationStatus:'pending_review'|'validated'|'changes_requested'|null;
  leaderFeedback:string|null;
  reviewerPrivateObservation?:string|null;
  reviewedAt:number|null;
  reviewedByName:string|null;
  officialCategory:string|null;
  orientativeBand:string|null;
};
type WorkActivity = {
  id:string; title:string; description:string; status:'in_progress'|'completed'; completedAt:number|null;
  validationStatus:'pending_review'|'validated'|'changes_requested'; reviewedAt?:number|null; reviewedByName?:string|null;
  privateFeedback?:Array<{ id:string; content:string; createdAt:number; authorName:string|null }>;
};
type ProfileAnalysis = {
  maturityBand:'T1'|'T2'|'T3';
  maturityConfidence:'low'|'medium'|'high';
  maturitySummary:string;
  workSummary:string;
  waysOfWorking:string[];
  profileNeeds:string[];
  developmentGuidance:string[];
  missingInformation:string[];
  humanValidationRequired:true;
  currentRole:string;
  nextRole:string|null;
  updatedAt:number;
};
type Evidence = { id:string; title:string; description:string; evidenceType:string; occurredAt:number; validationStatus:'draft'|'pending'|'validated'|'rejected'; originalFilename:string|null; contentType:string|null; sizeBytes:number|null; leaderFeedback:string|null; reviewedAt:number|null; reviewedByName:string|null };
type Dashboard = {
  profile:Profile|null;
  evidence:Evidence[];
  workActivities:WorkActivity[];
  profileAnalysis:{ currentRole:string; nextRole:string|null; analysisJson:string; model:string; modelVersion:string; updatedAt:number } | null;
};

const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const maturityMessages = {
  T1:'Estás desarrollando autonomía en tu rol.',
  T2:'Muestras autonomía y madurez en tu rol.',
  T3:'Te estás preparando para tu próximo desafío.',
} as const;
const confidenceLabels = { low:'baja', medium:'media', high:'alta' } as const;
const evidenceStatusLabels = { draft:'Borrador', pending:'Pendiente de revisión', validated:'Validada', rejected:'No validada' } as const;
const taskValidationLabels = { pending_review:'Pendiente de revisión', validated:'Validada por líder', changes_requested:'Requiere ajustes' } as const;

function qualitativeMaturityLanguage(text: string) {
  return text
    .replace(/Orientativamente,\s+el tramo\s+T1\s+parece el más cercano:/gi, 'Según la información disponible, estás desarrollando autonomía en tu rol:')
    .replace(/Orientativamente,\s+el tramo\s+T2\s+parece el más cercano:/gi, 'Según la información disponible, muestras autonomía y madurez en tu rol:')
    .replace(/Orientativamente,\s+el tramo\s+T3\s+parece el más cercano:/gi, 'Según la información disponible, te estás preparando para tu próximo desafío:')
    .replace(/\bT1\b/g, 'desarrollo de autonomía')
    .replace(/\bT2\b/g, 'autonomía y madurez en el rol')
    .replace(/\bT3\b/g, 'preparación para un próximo desafío')
    .replace(/\btramo de madurez orientativo\b/gi, 'orientación de desarrollo')
    .replace(/\btramo orientativo\b/gi, 'orientación de desarrollo')
    .replace(/\beste tramo\b/gi, 'esta orientación')
    .replace(/\bel tramo\s+/gi, 'la orientación de ')
    .replace(/\btramo\b/gi, 'orientación');
}
const evidenceTypeLabels:Record<string,string> = { achievement:'Hito o resultado', certification:'Certificación', feedback:'Feedback', learning:'Aprendizaje' };

export default function Home() {
  const [role, setRole] = useState<'collaborator' | 'leader' | 'admin'>('collaborator');
  const [demoProfile, setDemoProfile] = useState<'sample'|'empty'>('sample');
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [dashboardError, setDashboardError] = useState('');
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceSaved, setEvidenceSaved] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  const [evidenceReviewFeedback, setEvidenceReviewFeedback] = useState<Record<string,string>>({});
  const [evidenceReviewBusy, setEvidenceReviewBusy] = useState<string|null>(null);
  const [evidenceReviewNotice, setEvidenceReviewNotice] = useState('');
  const [evidenceFileBusy, setEvidenceFileBusy] = useState<string|null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileReviewFeedback, setProfileReviewFeedback] = useState('');
  const [profilePrivateObservation, setProfilePrivateObservation] = useState('');
  const [profileReviewBusy, setProfileReviewBusy] = useState(false);
  const [profileReviewNotice, setProfileReviewNotice] = useState('');
  const [careerFamilyId, setCareerFamilyId] = useState('');
  const [careerTrackId, setCareerTrackId] = useState('');
  const [careerRoleId, setCareerRoleId] = useState('');
  const [taskForm, setTaskForm] = useState({ title:'', description:'' });
  const [taskBusy, setTaskBusy] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [taskReviewFeedback, setTaskReviewFeedback] = useState<Record<string,string>>({});
  const [taskReviewBusy, setTaskReviewBusy] = useState<string|null>(null);
  const [taskReviewNotice, setTaskReviewNotice] = useState('');
  const [orientation, setOrientation] = useState<ProfileAnalysis | null>(null);
  const [orientationBusy, setOrientationBusy] = useState(false);
  const [orientationError, setOrientationError] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [mapFamilyId, setMapFamilyId] = useState('');
  const [mapTrackId, setMapTrackId] = useState('');
  const [mapRoleId, setMapRoleId] = useState('');

  const demoHeaders = useMemo(() => {
    const headers:Record<string,string> = { 'x-demo-role':role };
    if (role === 'collaborator' && demoProfile === 'empty') headers['x-demo-profile'] = 'empty';
    return headers;
  }, [role, demoProfile]);

  async function refreshDashboard() {
    const response = await fetch('/api/dashboard', { headers:demoHeaders });
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?:string };
      setDashboardError(data.error ?? 'No fue posible cargar tu información.');
      return;
    }
    setDashboard(await response.json() as Dashboard);
    setDashboardError('');
  }

  useEffect(() => {
    let current = true;
    void fetch('/api/dashboard', { headers:demoHeaders })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json().catch(() => ({})) as { error?:string };
          if (current) setDashboardError(data.error ?? 'No fue posible cargar tu información.');
          return null;
        }
        return response.json() as Promise<Dashboard>;
      })
      .then((data) => {
        if (!current || !data) return;
        setDashboard(data);
        setDashboardError('');
        setProfileNotice('');
        setTaskError('');
        // Cargar análisis persistido desde el dashboard (no borrarlo al refrescar)
        if (data.profileAnalysis?.analysisJson) {
          try {
            const stored = JSON.parse(data.profileAnalysis.analysisJson) as Partial<ProfileAnalysis>;
            if (stored.maturityBand && stored.maturitySummary && stored.workSummary) {
              setOrientation({ ...stored, currentRole:data.profileAnalysis.currentRole, nextRole:data.profileAnalysis.nextRole, updatedAt:data.profileAnalysis.updatedAt } as ProfileAnalysis);
            } else {
              setOrientation(null);
            }
          } catch { /* análisis corrupto, se ignora */ }
        } else setOrientation(null);
        setOrientationError('');
      });
    return () => { current = false; };
  }, [demoHeaders]);

  const profile = dashboard?.profile;
  const storedRoleSelection = getCareerRoleSelectionByLabel(profile?.currentJobRole);
  const selectedCareerFamilyId = careerFamilyId || storedRoleSelection?.family.id || '';
  const selectedCareerFamily = careerFamilies.find((family) => family.id === selectedCareerFamilyId);
  const selectedCareerTrackId = careerTrackId || (!careerFamilyId ? storedRoleSelection?.track.id ?? '' : '');
  const selectedCareerTrack = selectedCareerFamily?.tracks.find((track) => track.id === selectedCareerTrackId);
  const selectedCareerRoleId = careerRoleId || (!careerFamilyId && !careerTrackId ? storedRoleSelection?.role.id ?? '' : '');
  const selectedCareerRole = selectedCareerTrack?.roles.find((item) => item.id === selectedCareerRoleId);
  const firstName = profile?.fullName?.split(' ')[0] ?? 'persona';
  const currentRole = profile?.currentJobRole ?? 'Perfil por completar';
  const initials = (profile?.fullName ?? 'EP').split(' ').map((part) => part.charAt(0)).join('').slice(0,2).toUpperCase();
  const maturityMessage = orientation ? maturityMessages[orientation.maturityBand] : 'Aún no hay una orientación sobre tu desarrollo.';
  const displayedMaturitySummary = orientation ? qualitativeMaturityLanguage(orientation.maturitySummary) : null;
  const currentCareerSelection = getCareerRoleSelectionByLabel(profile?.currentJobRole);
  const profileValidationLabel = profile?.validationStatus === 'validated'
    ? 'Validado'
    : profile?.validationStatus === 'changes_requested'
      ? 'Ajustes solicitados'
      : profile?.profileCompleted
        ? 'Pendiente de validación'
        : 'Pendiente';
  const effectiveMapFamilyId = mapFamilyId || currentCareerSelection?.family.id || careerFamilies[0]?.id || '';
  const mapFamily = careerFamilies.find((family) => family.id === effectiveMapFamilyId);
  const effectiveMapTrackId = mapTrackId || (mapFamily?.id === currentCareerSelection?.family.id ? currentCareerSelection?.track.id : mapFamily?.tracks[0]?.id) || '';
  const mapTrack = mapFamily?.tracks.find((track) => track.id === effectiveMapTrackId);
  const effectiveMapRoleId = mapRoleId || (mapTrack?.id === currentCareerSelection?.track.id ? currentCareerSelection?.role.id : mapTrack?.roles[0]?.id) || '';
  const exploredRole = mapTrack?.roles.find((item) => item.id === effectiveMapRoleId) ?? mapTrack?.roles[0];
  const nextCareerRole = currentCareerSelection ? getNextRole(currentCareerSelection.role.id)?.role : undefined;
  const nextAction = useMemo(() => {
    const workActivities = dashboard?.workActivities ?? [];
    const evidence = dashboard?.evidence ?? [];
    if (role === 'leader') {
      if (profile?.validationStatus === 'pending_review') return { title:'Revisa el perfil de desarrollo', description:'La persona envió información que requiere tu contraste y validación.', target:'#perfil-inicial', label:'Revisar perfil' };
      if (evidence.some((item) => item.validationStatus === 'pending')) return { title:'Revisa una evidencia pendiente', description:'Confirma si puede usarse como antecedente para la conversación de desarrollo.', target:'#evidencias', label:'Revisar evidencias' };
      if (workActivities.some((item) => item.validationStatus === 'pending_review')) return { title:'Revisa una tarea pendiente', description:'Valida la información declarada o registra feedback privado para orientar el análisis.', target:'#tareas', label:'Revisar tareas' };
      return { title:'Consulta la última orientación', description:'No hay revisiones operativas pendientes para esta persona.', target:'#historial', label:'Ver historial' };
    }
    if (role === 'admin') return { title:'Revisa la trazabilidad del perfil', description:'People acompaña el gobierno del modelo; las validaciones operativas corresponden al líder.', target:'#historial', label:'Ver historial' };
    if (!profile?.profileCompleted) return { title:'Completa tu perfil de desarrollo', description:'Describe tu rol y contexto para iniciar una conversación informada.', target:'#perfil-inicial', label:'Completar perfil' };
    if (profile.validationStatus === 'changes_requested') return { title:'Actualiza tu perfil de desarrollo', description:'Tu líder solicitó ajustes antes de continuar con la orientación.', target:'#perfil-inicial', label:'Actualizar perfil' };
    if (workActivities.length === 0 && evidence.length === 0) return { title:'Registra una tarea o evidencia', description:'Agrega un ejemplo de tu trabajo para dar contexto a la conversación.', target:'#tareas', label:'Registrar tarea' };
    if (!orientation) return { title:'Solicita tu orientación asistida por IA', description:'Con tu perfil y ejemplos registrados, prepara un borrador para conversar con tu líder.', target:'#orientacion', label:'Ver orientación' };
    return { title:'Mantén actualizada tu información', description:'Registra avances y resultados relevantes para enriquecer la próxima conversación.', target:'#tareas', label:'Actualizar tareas' };
  }, [dashboard, orientation, profile, role]);

  async function askGuide(question: string) {
    const clean = question.trim();
    if (!clean || isThinking) return;
    setIsThinking(true);
    setPrompt('');
    try {
      const response = await fetch('/api/ai/guide', {
        method:'POST',
        headers:{ ...demoHeaders, 'Content-Type':'application/json' },
        body:JSON.stringify({ question:clean }),
      });
      const data = await response.json() as { answer?:string; error?:string };
      setMessages((current) => [...current, qualitativeMaturityLanguage(data.answer ?? data.error ?? 'No fue posible generar una orientación.')]);
    } catch {
      setMessages((current) => [...current, 'No fue posible conectar con la guía en este momento.']);
    } finally {
      setIsThinking(false);
    }
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileNotice('');
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch('/api/profile', {
        method:'PUT',
        headers:{ ...demoHeaders, 'Content-Type':'application/json' },
        body:JSON.stringify({
          careerRoleId:String(form.get('careerRoleId') ?? ''),
          workContext:String(form.get('workContext') ?? ''),
          developmentGoal:String(form.get('developmentGoal') ?? ''),
        }),
      });
      const data = await response.json() as { error?:string };
      if (!response.ok) {
        setProfileNotice(data.error ?? 'No fue posible guardar el perfil.');
        return;
      }
      setProfileEditing(false);
      setOrientation(null);
      setProfileNotice('Perfil enviado a validación. Quedará visible como ficha de solo lectura mientras espera revisión.');
      await refreshDashboard();
    } catch {
      setProfileNotice('No fue posible conectar para guardar el perfil.');
    } finally {
      setProfileBusy(false);
    }
  }

  function openProfileEditor() {
    setCareerFamilyId(storedRoleSelection?.family.id ?? '');
    setCareerTrackId(storedRoleSelection?.track.id ?? '');
    setCareerRoleId(storedRoleSelection?.role.id ?? '');
    setProfileNotice('');
    setProfileEditing(true);
  }

  function cancelProfileEditing() {
    setCareerFamilyId('');
    setCareerTrackId('');
    setCareerRoleId('');
    setProfileNotice('');
    setProfileEditing(false);
  }

  async function reviewProfile(decision: 'validate'|'changes') {
    if (!profile || profileReviewBusy) return;
    setProfileReviewBusy(true);
    setProfileReviewNotice('');
    try {
      const response = await fetch('/api/profile/review', {
        method:'POST',
        headers:{ ...demoHeaders, 'Content-Type':'application/json' },
        body:JSON.stringify({ targetUserId:profile.id, decision, feedback:profileReviewFeedback, privateObservation:profilePrivateObservation }),
      });
      const data = await response.json() as { error?:string };
      if (!response.ok) {
        setProfileReviewNotice(data.error ?? 'No fue posible registrar la revisión.');
        return;
      }
      setProfileReviewFeedback('');
      setProfilePrivateObservation('');
      setProfileReviewNotice(decision === 'validate' ? 'Perfil validado y registrado en el historial.' : 'Se solicitaron ajustes a la persona colaboradora.');
      await refreshDashboard();
    } catch {
      setProfileReviewNotice('No fue posible conectar para registrar la revisión.');
    } finally {
      setProfileReviewBusy(false);
    }
  }

  async function submitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTaskBusy(true);
    setTaskError('');
    try {
      const response = await fetch('/api/work-activities', {
        method:'POST',
        headers:{ ...demoHeaders, 'Content-Type':'application/json' },
        body:JSON.stringify({ ...taskForm, status:'in_progress' }),
      });
      const data = await response.json() as { error?:string };
      if (!response.ok) {
        setTaskError(data.error ?? 'No fue posible registrar la tarea.');
        return;
      }
      setTaskForm({ title:'', description:'' });
      await refreshDashboard();
    } catch {
      setTaskError('No fue posible conectar para registrar la tarea.');
    } finally {
      setTaskBusy(false);
    }
  }

  async function updateTaskStatus(activity: WorkActivity) {
    setTaskError('');
    const nextStatus = activity.status === 'completed' ? 'in_progress' : 'completed';
    try {
      const response = await fetch('/api/work-activities/' + activity.id, {
        method:'PATCH',
        headers:{ ...demoHeaders, 'Content-Type':'application/json' },
        body:JSON.stringify({ status:nextStatus }),
      });
      const data = await response.json() as { error?:string };
      if (!response.ok) {
        setTaskError(data.error ?? 'No fue posible actualizar la tarea.');
        return;
      }
      await refreshDashboard();
    } catch {
      setTaskError('No fue posible conectar para actualizar la tarea.');
    }
  }

  async function reviewTask(activity: WorkActivity, decision:'validate'|'changes') {
    if (taskReviewBusy) return;
    setTaskReviewBusy(activity.id);
    setTaskReviewNotice('');
    try {
      const response = await fetch('/api/work-activities/' + activity.id + '/review', {
        method:'POST', headers:{ ...demoHeaders, 'Content-Type':'application/json' }, body:JSON.stringify({ decision }),
      });
      const data = await response.json() as { error?:string };
      if (!response.ok) { setTaskReviewNotice(data.error ?? 'No fue posible revisar la tarea.'); return; }
      setTaskReviewNotice(decision === 'validate' ? 'Tarea validada. El próximo análisis considerará su estado revisado.' : 'Se solicitaron ajustes a la tarea. La persona podrá actualizarla y reenviarla a revisión.');
      await refreshDashboard();
    } catch { setTaskReviewNotice('No fue posible conectar para revisar la tarea.'); }
    finally { setTaskReviewBusy(null); }
  }

  async function saveTaskFeedback(activity: WorkActivity) {
    if (taskReviewBusy) return;
    const content = taskReviewFeedback[activity.id] ?? '';
    setTaskReviewBusy(activity.id);
    setTaskReviewNotice('');
    try {
      const response = await fetch('/api/work-activities/' + activity.id + '/feedback', {
        method:'POST', headers:{ ...demoHeaders, 'Content-Type':'application/json' }, body:JSON.stringify({ content }),
      });
      const data = await response.json() as { error?:string };
      if (!response.ok) { setTaskReviewNotice(data.error ?? 'No fue posible guardar el feedback.'); return; }
      setTaskReviewFeedback((current) => ({ ...current, [activity.id]:'' }));
      setTaskReviewNotice('Feedback privado guardado como contexto interno para el próximo análisis.');
      await refreshDashboard();
    } catch { setTaskReviewNotice('No fue posible conectar para guardar el feedback.'); }
    finally { setTaskReviewBusy(null); }
  }

  async function requestOrientation() {
    setOrientationBusy(true);
    setOrientationError('');
    try {
      const response = await fetch('/api/ai/profile-analysis', { method:'POST', headers:demoHeaders });
      const data = await response.json() as ProfileAnalysis & { error?:string };
      if (!response.ok) {
        setOrientationError(data.error ?? 'No fue posible preparar la orientación.');
        return;
      }
      setOrientation(data);
    } catch {
      setOrientationError('No fue posible conectar con el servicio de orientación.');
    } finally {
      setOrientationBusy(false);
    }
  }

  async function submitEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEvidenceError('');
    const response = await fetch('/api/evidence', { method:'POST', headers:demoHeaders, body:new FormData(event.currentTarget) });
    if (!response.ok) {
      const data = await response.json().catch(() => ({})) as { error?:string };
      setEvidenceError(data.error ?? 'No fue posible registrar la evidencia.');
      return;
    }
    setEvidenceSaved(true);
    await refreshDashboard();
    window.setTimeout(() => {
      setEvidenceOpen(false);
      setEvidenceSaved(false);
    }, 900);
  }

  async function reviewEvidence(evidence: Evidence, decision:'validate'|'reject') {
    if (evidenceReviewBusy) return;
    setEvidenceReviewBusy(evidence.id);
    setEvidenceReviewNotice('');
    try {
      const response = await fetch('/api/evidence/' + evidence.id + '/review', {
        method:'POST',
        headers:{ ...demoHeaders, 'Content-Type':'application/json' },
        body:JSON.stringify({ decision, feedback:evidenceReviewFeedback[evidence.id] ?? '' }),
      });
      const data = await response.json() as { error?:string };
      if (!response.ok) {
        setEvidenceReviewNotice(data.error ?? 'No fue posible registrar la revisión de la evidencia.');
        return;
      }
      setEvidenceReviewFeedback((current) => ({ ...current, [evidence.id]:'' }));
      setEvidenceReviewNotice(decision === 'validate' ? 'Evidencia validada. El próximo análisis de perfil reflejará este estado.' : 'La evidencia quedó como no validada y se notificó el feedback.');
      await refreshDashboard();
    } catch {
      setEvidenceReviewNotice('No fue posible conectar para revisar la evidencia.');
    } finally {
      setEvidenceReviewBusy(null);
    }
  }

  async function downloadEvidenceFile(evidence: Evidence) {
    if (evidenceFileBusy || !evidence.originalFilename) return;
    setEvidenceFileBusy(evidence.id);
    setEvidenceReviewNotice('');
    try {
      const response = await fetch('/api/evidence/' + evidence.id + '/file', { headers:demoHeaders });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as { error?:string };
        setEvidenceReviewNotice(data.error ?? 'No fue posible acceder al archivo privado.');
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = evidence.originalFilename;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setEvidenceReviewNotice('No fue posible acceder al archivo privado.');
    } finally {
      setEvidenceFileBusy(null);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand" aria-label="Evoluciona"><span className="brand-mark">E</span><span>Evoluciona</span></div>
        <nav className="main-nav" aria-label="Navegación principal">
          <a className="nav-item active" href="#resumen"><House aria-hidden="true" /> {role === 'collaborator' ? 'Mi desarrollo' : 'Perfil de ' + firstName}</a>
          <a className="nav-item" href="#perfil-inicial"><UserRound aria-hidden="true" /> Perfil de desarrollo</a>
          <a className="nav-item" href="#tareas"><ClipboardCheck aria-hidden="true" /> {role === 'collaborator' ? 'Mis tareas' : 'Tareas de trabajo'}</a>
          <a className="nav-item" href="#ruta"><Map aria-hidden="true" /> Mapa de carrera</a>
          <a className="nav-item" href="#evidencias"><FileText aria-hidden="true" /> Evidencias</a>
          <a className="nav-item" href="#historial"><History aria-hidden="true" /> {role === 'collaborator' ? 'Mi historial' : 'Historial'}</a>
        </nav>
        <div className="side-note">
          <span className="side-label">Siguiente acción</span>
          <strong>{nextAction.title}</strong>
          <span>{nextAction.description}</span>
        </div>
        <div className="user-card">
          <span className="avatar">{initials}</span>
          <span><strong>{profile?.fullName ?? 'Cargando perfil'}</strong><small>{currentRole}</small></span>
          <button aria-label="Abrir opciones de usuario"><MoreHorizontal aria-hidden="true" /></button>
        </div>
      </aside>

      <section className="workspace" id="resumen">
        <header className="topbar">
          <div><span className="mobile-brand">E</span><p className="breadcrumb">Mi desarrollo / Resumen</p></div>
          <div className="top-actions">
            <button className="icon-button" aria-label="Notificaciones"><Bell aria-hidden="true" /></button>
            {isDevelopment && role === 'collaborator' && (
              <label className="role-switcher">Prueba
                <select value={demoProfile} onChange={(event) => { setDemoProfile(event.target.value as 'sample'|'empty'); setProfileEditing(false); setProfileReviewFeedback(''); setProfilePrivateObservation(''); setProfileReviewNotice(''); }}>
                  <option value="sample">Perfil con datos</option>
                  <option value="empty">Perfil desde cero</option>
                </select>
              </label>
            )}
            <label className="role-switcher">Vista de perfil
              <select value={role} onChange={(event) => { setRole(event.target.value as typeof role); setProfileEditing(false); setProfileReviewFeedback(''); setProfilePrivateObservation(''); setProfileReviewNotice(''); setTaskReviewFeedback({}); setTaskReviewNotice(''); }}>
                <option value="collaborator">Colaborador</option><option value="leader">Líder</option><option value="admin">People</option>
              </select>
            </label>
          </div>
        </header>

        <div className="content">
          {dashboardError && <p className="form-error page-error" role="alert">{dashboardError}</p>}
          <section className="hero" id="perfil">
            <div className="hero-copy">
              <h1>{profile?.profileCompleted ? <><span>Hola, {firstName}.</span> Este es tu momento actual.</> : <><span>Comencemos por tu</span> perfil de desarrollo.</>}</h1>
              <p>{profile?.profileCompleted ? 'Registra tareas y evidencias para preparar tus próximos pasos junto a tu líder.' : 'Describe tu posición y el trabajo que realizas. Estos datos son tuyos y no modifican ninguna categoría oficial.'}</p>
              <div className="human-loop"><span className="loop-icon"><Bot aria-hidden="true" /></span><span><strong>Orientación asistida por IA</strong><small>Es una sugerencia; requiere validación de tu líder y de People para cualquier cambio oficial.</small></span></div>
            </div>
            <div className="maturity-card">
              <div className="maturity-head"><span>Orientación sobre tu desarrollo</span><span className="status-pill">{orientation ? 'Análisis listo' : 'Pendiente de análisis'}</span></div>
              <div className="maturity-copy"><Sparkles aria-hidden="true" /><div><h2>{maturityMessage}</h2><p>{orientation ? `Confianza ${confidenceLabels[orientation.maturityConfidence]}; requiere contraste con tu líder.` : 'Completa tu perfil y registra ejemplos de qué haces y cómo trabajas.'}</p></div></div>
              {orientation && displayedMaturitySummary && (
                <div className="maturity-analysis-snippet" aria-label="Resumen del último análisis">
                  <span className="snippet-label"><Sparkles aria-hidden="true" />Resumen del análisis</span>
                  <p>{displayedMaturitySummary.length > 230 ? displayedMaturitySummary.slice(0, 227) + '…' : displayedMaturitySummary}</p>
                  {orientation.updatedAt && <span className="snippet-date">{new Date(orientation.updatedAt).toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric' })}</span>}
                </div>
              )}
            </div>
          </section>

          <section className={'next-action-card next-action-' + role} aria-label="Siguiente acción principal">
            <div><span className="action-eyebrow">Siguiente acción principal</span><h2>{nextAction.title}</h2><p>{nextAction.description}</p></div>
            <button className="approve-button" type="button" onClick={() => document.querySelector(nextAction.target)?.scrollIntoView({ behavior:'smooth' })}>{nextAction.label}</button>
          </section>

          {role === 'leader' && (
            <section className="role-context leader-context">
              <div><h2>La orientación necesita una mirada humana</h2><p>La IA organiza señales; el líder contrasta el contexto y entrega feedback.</p></div>
              <div className="review-queue"><span><strong>Colaboradora demostrativa</strong><small>Análisis de perfil · referencia orientativa</small></span><button onClick={() => document.querySelector('#orientacion')?.scrollIntoView({ behavior:'smooth' })}>Ver análisis</button></div>
            </section>
          )}
          {role === 'admin' && (
            <section className="role-context admin-context">
              <div><h2>People · modelo GDNe-2026.1</h2><p>Vista de gobierno y trazabilidad. Las validaciones operativas corresponden al líder asignado.</p></div>
              <div className="guardrail-list"><span><Check aria-hidden="true" /> IA sin permisos de decisión</span><span><Check aria-hidden="true" /> Auditoría de cambios</span><span><Check aria-hidden="true" /> Evidencias privadas</span></div>
            </section>
          )}

          <details className="ai-explainer">
            <summary><span><Bot aria-hidden="true" /> Cómo funciona la orientación asistida por IA</span><small>Ver detalles</small></summary>
            <div className="ai-explainer-grid">
              <section><strong>Qué hace</strong><p>Organiza la información disponible, explica las necesidades del rol e identifica señales o información que conviene contrastar en una conversación de desarrollo.</p></section>
              <section><strong>Qué información utiliza</strong><p>El perfil declarado, las tareas, las evidencias y sus estados de revisión, además de los criterios del mapa de carrera. Las observaciones privadas del líder, si existen, se procesan solo en el servidor y no se muestran ni se citan.</p></section>
              <section><strong>Qué no puede hacer</strong><p>No evalúa desempeño, no decide promociones, categorías ni compensaciones; tampoco valida perfiles, tareas o evidencias, ni modifica información oficial.</p></section>
            </div>
          </details>

          <div className="dashboard-grid">
            <section className="panel profile-panel" id="perfil-inicial">
              <div className="panel-heading"><div><h2>{role === 'collaborator' ? 'Mi perfil de desarrollo' : 'Perfil de desarrollo de ' + firstName}</h2><p className="panel-subtitle">{role === 'collaborator' ? 'Información declarada por ti. No cambia tu posición ni categoría oficial.' : 'Información declarada por la persona. La validación no modifica su categoría oficial.'}</p></div><span className={'review-pill status-' + (profile?.validationStatus ?? 'pending')}>{profileValidationLabel}</span></div>
              {role === 'collaborator' && (!profile?.profileCompleted || profileEditing) ? (
                <form className="profile-form" key={(profile?.fullName ?? 'sin-perfil') + String(profile?.profileCompleted)} onSubmit={submitProfile}>
                  <div className="role-selectors">
                    <label>Familia
                      <select value={selectedCareerFamilyId} required onChange={(event) => { setCareerFamilyId(event.target.value); setCareerTrackId(''); setCareerRoleId(''); }}>
                        <option value="">Selecciona una familia</option>
                        {careerFamilies.map((family) => <option key={family.id} value={family.id}>{family.label}</option>)}
                      </select>
                    </label>
                    <label>Ruta
                      <select value={selectedCareerTrackId} required disabled={!selectedCareerFamily} onChange={(event) => { setCareerTrackId(event.target.value); setCareerRoleId(''); }}>
                        <option value="">Selecciona una ruta</option>
                        {(selectedCareerFamily?.tracks ?? []).map((track) => <option key={track.id} value={track.id}>{track.label}</option>)}
                      </select>
                    </label>
                    <label>Posición o rol actual
                      <select name="careerRoleId" value={selectedCareerRoleId} required disabled={!selectedCareerTrack} onChange={(event) => setCareerRoleId(event.target.value)}>
                        <option value="">Selecciona una posición</option>
                        {(selectedCareerTrack?.roles ?? []).map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                      </select>
                    </label>
                  </div>
                  <p className="model-reference">Roles establecidos según {selectedCareerRole ? 'página ' + selectedCareerRole.sourcePage : 'el Mapa de Talento GDNe IBIOL'} · versión GDNe-2026.1.</p>
                  <label>¿En qué trabajas hoy?<textarea name="workContext" required minLength={10} maxLength={1200} rows={3} defaultValue={profile?.workContext ?? ''} placeholder="Describe tu contexto, productos, equipo o responsabilidades actuales." /></label>
                  <label>Foco de desarrollo (opcional)<textarea name="developmentGoal" maxLength={600} rows={2} defaultValue={profile?.developmentGoal ?? ''} placeholder="Ej.: comunicar decisiones técnicas con mayor claridad." /></label>
                  <div className="profile-form-actions"><button className="approve-button" type="submit" disabled={profileBusy}>{profileBusy ? 'Guardando…' : profile?.profileCompleted ? 'Guardar cambios y enviar a validación' : 'Guardar y enviar a validación'}</button>{profile?.profileCompleted && <button className="outline-button" type="button" onClick={cancelProfileEditing} disabled={profileBusy}>Cancelar</button>}{profileNotice && <p className={profileNotice.startsWith('Perfil enviado') ? 'form-success' : 'form-error'} role="status">{profileNotice}</p>}</div>
                </form>
              ) : profile?.profileCompleted ? (
                <div className="profile-readonly" aria-live="polite">
                  <div className="profile-summary-grid">
                    <dl><dt>Familia</dt><dd>{currentCareerSelection?.family.canonicalLabel ?? 'Sin identificar'}</dd></dl>
                    <dl><dt>Ruta</dt><dd>{currentCareerSelection?.track.label ?? 'Sin identificar'}</dd></dl>
                    <dl><dt>Posición o rol actual</dt><dd>{profile.currentJobRole}</dd></dl>
                  </div>
                  <p className="model-reference">Rol declarado según el Mapa de Talento GDNe IBIOL · {currentCareerSelection ? 'página ' + currentCareerSelection.role.sourcePage : 'referencia pendiente'} · versión {CAREER_MODEL_VERSION}.</p>
                  <div className="profile-readonly-text"><strong>¿En qué trabajas hoy?</strong><p>{profile.workContext}</p></div>
                  {profile.developmentGoal && <div className="profile-readonly-text"><strong>Foco de desarrollo</strong><p>{profile.developmentGoal}</p></div>}
                  {profile.leaderFeedback && <div className="profile-feedback"><strong>{profile.validationStatus === 'changes_requested' ? 'Ajustes solicitados' : 'Comentario de revisión'}</strong><p>{profile.leaderFeedback}</p></div>}
                  {role !== 'collaborator' && profile.reviewerPrivateObservation && <div className="profile-private-observation"><strong>Observación privada para la orientación</strong><p>{profile.reviewerPrivateObservation}</p><small>Solo visible para liderazgo y People; no se muestra ni se cita a la persona colaboradora.</small></div>}
                  <div className="profile-readonly-footer">
                    <span>{profile.validationStatus === 'validated' ? 'Validado' + (profile.reviewedByName ? ' por ' + profile.reviewedByName : '') + (profile.reviewedAt ? ' el ' + new Date(profile.reviewedAt).toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric' }) : '') : profile.validationStatus === 'changes_requested' ? 'Actualiza el perfil para volver a enviarlo a revisión.' : 'Esperando validación de tu líder.'}</span>
                    {role === 'collaborator' && <button className="outline-button" type="button" onClick={openProfileEditor}>Editar perfil</button>}
                  </div>
                  {profileNotice && <p className={profileNotice.startsWith('Perfil enviado') ? 'form-success' : 'form-error'} role="status">{profileNotice}</p>}
                  {role === 'leader' && (
                    <div className="profile-review">
                      {profile.validationStatus === 'pending_review' ? <>
                        <h3>Revisión humana</h3><p>Contrasta la información declarada con la conversación y antecedentes disponibles. Esta decisión no cambia ninguna categoría oficial.</p>
                        <label>Feedback para la persona (obligatorio al solicitar ajustes)<textarea value={profileReviewFeedback} maxLength={1200} rows={3} onChange={(event) => setProfileReviewFeedback(event.target.value)} placeholder="Indica observaciones o los datos que se deben completar." /></label>
                        <label className="private-observation-label">Observación privada para orientar el análisis de IA<textarea value={profilePrivateObservation} maxLength={600} rows={3} onChange={(event) => setProfilePrivateObservation(event.target.value)} placeholder="Contexto que conviene contrastar en la orientación. No incluyas datos sensibles." /><small>No será visible para la persona colaboradora ni se citará en el resultado. La IA la usa solo para identificar qué señales debe contrastar.</small></label>
                        <div className="profile-form-actions"><button className="approve-button" type="button" onClick={() => void reviewProfile('validate')} disabled={profileReviewBusy}>{profileReviewBusy ? 'Registrando…' : 'Validar perfil'}</button><button className="outline-button" type="button" onClick={() => void reviewProfile('changes')} disabled={profileReviewBusy}>Solicitar ajustes</button></div>
                      </> : <p className="helper-text">{profile.validationStatus === 'validated' ? 'Este perfil ya fue validado. Si la persona lo edita, volverá a quedar pendiente de revisión.' : 'Se solicitaron ajustes; espera una nueva versión de la persona colaboradora.'}</p>}
                      {profileReviewNotice && <p className={profileReviewNotice.startsWith('Perfil validado') || profileReviewNotice.startsWith('Se solicitaron') ? 'form-success' : 'form-error'} role="status">{profileReviewNotice}</p>}
                    </div>
                  )}
                </div>
              ) : <p className="empty-copy">La persona colaboradora aún no ha enviado su perfil de desarrollo.</p>}
            </section>

            <section className="panel tasks-panel" id="tareas">
              <div className="panel-heading"><div><h2>{role === 'collaborator' ? 'Mis tareas de trabajo' : 'Tareas de trabajo de ' + firstName}</h2><p className="panel-subtitle">{role === 'collaborator' ? 'Registra lo que estás realizando o ya completaste. Cada actualización queda pendiente de revisión.' : role === 'leader' ? 'Valida tareas declaradas y registra feedback privado para enriquecer el próximo análisis.' : 'Consulta las tareas, sus estados de revisión y su trazabilidad.'}</p></div><span className="count-badge neutral">{dashboard?.workActivities?.length ?? 0}</span></div>
              {role === 'collaborator' && (
                <form className="task-form" onSubmit={submitTask}>
                  <label>Tarea<input required minLength={3} maxLength={160} value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title:event.target.value }))} placeholder="Ej.: Preparar una revisión técnica" /></label>
                  <label>Contexto, aporte y resultado esperado<textarea required minLength={10} maxLength={1600} rows={3} value={taskForm.description} onChange={(event) => setTaskForm((current) => ({ ...current, description:event.target.value }))} placeholder="Describe qué estás haciendo y qué resultado esperas lograr." /></label>
                  <button className="outline-button" type="submit" disabled={taskBusy || !profile?.profileCompleted}>{taskBusy ? 'Registrando…' : 'Agregar tarea en curso'}</button>
                </form>
              )}
              {!profile?.profileCompleted && role === 'collaborator' && <p className="helper-text">Primero guarda tu perfil de desarrollo para registrar tareas.</p>}
              <div className="task-list">
                {(dashboard?.workActivities ?? []).map((activity) => (
                  <article className="task-item" key={activity.id}>
                    <button className={'task-toggle ' + activity.status} onClick={() => void updateTaskStatus(activity)} disabled={role !== 'collaborator'} aria-label={activity.status === 'completed' ? 'Marcar tarea como en curso' : 'Marcar tarea como completada'}>{activity.status === 'completed' && <Check aria-hidden="true" />}</button>
                    <div className="task-copy"><strong>{activity.title}</strong><p>{activity.description}</p><small>{activity.status === 'completed' ? 'Completada' : 'En curso'} · declaración de la persona · <span className={'task-validation status-' + activity.validationStatus}>{taskValidationLabels[activity.validationStatus]}</span>{activity.reviewedByName ? ' · ' + activity.reviewedByName : ''}</small>
                      {role !== 'collaborator' && activity.privateFeedback && activity.privateFeedback.length > 0 && <div className="task-private-feedback"><strong>Feedback privado del líder</strong>{activity.privateFeedback.map((feedback) => <p key={feedback.id}>{feedback.content}<small>{feedback.authorName ? feedback.authorName + ' · ' : ''}{new Date(feedback.createdAt).toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric' })}</small></p>)}</div>}
                      {role === 'leader' && <div className="task-review">
                        <label>Feedback privado para la orientación de IA<textarea value={taskReviewFeedback[activity.id] ?? ''} maxLength={600} rows={3} onChange={(event) => setTaskReviewFeedback((current) => ({ ...current, [activity.id]:event.target.value }))} placeholder="Describe señales o aspectos que conviene contrastar. No incluyas datos sensibles." /><small>Solo es visible para Liderazgo y People. La IA lo usa como contexto interno y nunca lo citará.</small></label>
                        <div className="profile-form-actions"><button className="outline-button" type="button" onClick={() => void saveTaskFeedback(activity)} disabled={taskReviewBusy !== null}>{taskReviewBusy === activity.id ? 'Guardando…' : 'Guardar feedback privado'}</button>{activity.validationStatus === 'pending_review' && <><button className="approve-button" type="button" onClick={() => void reviewTask(activity, 'validate')} disabled={taskReviewBusy !== null}>Validar tarea</button><button className="outline-button" type="button" onClick={() => void reviewTask(activity, 'changes')} disabled={taskReviewBusy !== null}>Solicitar ajustes</button></>}</div>
                      </div>}
                    </div>
                  </article>
                ))}
                {dashboard && dashboard.workActivities.length === 0 && <p className="empty-copy">Aún no registras tareas. Agrega una para empezar a construir ejemplos de tu trabajo.</p>}
              </div>
              {taskError && <p className="form-error" role="alert">{taskError}</p>}
              {taskReviewNotice && <p className={taskReviewNotice.startsWith('Tarea validada') || taskReviewNotice.startsWith('Se solicitaron') || taskReviewNotice.startsWith('Feedback privado') ? 'form-success' : 'form-error'} role="status">{taskReviewNotice}</p>}
            </section>

            <section className="panel evidence-panel" id="evidencias">
              <div className="panel-heading compact"><div><h2>{role === 'collaborator' ? 'Evidencias' : 'Evidencias de ' + firstName}</h2><p className="evidence-intro">{role === 'collaborator' ? 'Documenta resultados, aprendizajes, certificaciones y feedback recibido.' : role === 'leader' ? 'Revisa evidencias declaradas, agrega feedback y valida o rechaza su uso como antecedente conversacional.' : 'Consulta las evidencias, sus estados de revisión y la trazabilidad disponible.'}</p></div><span className="count-badge">{dashboard?.evidence?.length ?? 0}</span></div>
              {role === 'collaborator' && <button className="primary-button evidence-create-button" onClick={() => setEvidenceOpen(true)}>+ Registrar evidencia</button>}
              <div className="evidence-list">
                {(dashboard?.evidence ?? []).map((evidence) => (
                  <article className="evidence-card" key={evidence.id}>
                    <div className="evidence-card-heading"><div><span className="evidence-type">{evidenceTypeLabels[evidence.evidenceType] ?? evidence.evidenceType}</span><h3>{evidence.title}</h3></div><span className={'evidence-status status-' + evidence.validationStatus}>{evidenceStatusLabels[evidence.validationStatus]}</span></div>
                    {evidence.description && <p>{evidence.description}</p>}
                    <div className="evidence-meta"><span>{new Date(evidence.occurredAt).toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric' })}</span>{evidence.originalFilename && <button type="button" onClick={() => void downloadEvidenceFile(evidence)} disabled={evidenceFileBusy === evidence.id}>{evidenceFileBusy === evidence.id ? 'Preparando archivo…' : 'Descargar archivo privado · ' + evidence.originalFilename}</button>}</div>
                    {evidence.leaderFeedback && <div className="evidence-feedback"><strong>Feedback de revisión{evidence.reviewedByName ? ' · ' + evidence.reviewedByName : ''}</strong><p>{evidence.leaderFeedback}</p></div>}
                    {role === 'leader' && evidence.validationStatus === 'pending' && <div className="evidence-review"><label>Feedback para la persona (obligatorio si no validas)<textarea value={evidenceReviewFeedback[evidence.id] ?? ''} maxLength={1200} rows={3} onChange={(event) => setEvidenceReviewFeedback((current) => ({ ...current, [evidence.id]:event.target.value }))} placeholder="Explica qué se confirmó o qué falta para poder validar." /></label><div className="profile-form-actions"><button className="primary-button" type="button" onClick={() => void reviewEvidence(evidence, 'validate')} disabled={evidenceReviewBusy !== null}>{evidenceReviewBusy === evidence.id ? 'Registrando…' : 'Validar evidencia'}</button><button className="evidence-reject-button" type="button" onClick={() => void reviewEvidence(evidence, 'reject')} disabled={evidenceReviewBusy !== null}>No validar</button></div></div>}
                  </article>
                ))}
                {dashboard && dashboard.evidence.length === 0 && <p className="evidence-empty">{role === 'collaborator' ? 'Aún no registras evidencias. Agrega un hito, aprendizaje o certificación para enriquecer la conversación de desarrollo.' : 'La persona aún no ha registrado evidencias para revisar.'}</p>}
              </div>
              {evidenceReviewNotice && <p className={evidenceReviewNotice.startsWith('Evidencia validada') || evidenceReviewNotice.startsWith('La evidencia quedó') ? 'evidence-success' : 'evidence-error'} role="status">{evidenceReviewNotice}</p>}
            </section>

            <section className="panel orientation-panel" id="orientacion">
              <div className="panel-heading"><div><h2>Análisis y orientación de mi perfil de desarrollo</h2><p className="panel-subtitle">La IA analiza qué haces, cómo trabajas y qué necesita tu perfil actual según el mapa de talento.</p></div><Sparkles className="panel-sparkle" aria-hidden="true" /></div>
              <button className="approve-button orientation-button" type="button" onClick={() => void requestOrientation()} disabled={role !== 'collaborator' || orientationBusy || !profile?.profileCompleted || (dashboard?.workActivities?.length === 0 && dashboard?.evidence?.length === 0)}>{orientationBusy ? 'Preparando borrador…' : orientation ? 'Actualizar análisis' : 'Analizar mi perfil (borrador IA)'}</button>
              <p className="ai-disclaimer" role="note"><strong>Orientación, no validación.</strong> Lo generado por IA es una sugerencia basada en la información declarada y puede no reflejar por completo tu caso real. Úsala para comprender tu avance y preparar conversaciones sobre tu carrera; debe contrastarse con tu líder y, para cualquier validación o cambio oficial, contar con la aprobación de People.</p>
              {orientationError && <p className="form-error" role="alert">{orientationError}</p>}
              {orientation && (
                <div className="orientation-result" aria-live="polite">
                  <div className="analysis-overview">
                    <span className="analysis-label">Orientación cualitativa</span>
                    <div>
                      <strong>{maturityMessage}</strong>
                      <p>{displayedMaturitySummary}</p>
                      <small>Confianza {confidenceLabels[orientation.maturityConfidence]}</small>
                    </div>
                  </div>
                  <div className="analysis-work-summary"><strong>Lo que haces hoy</strong><p>{qualitativeMaturityLanguage(orientation.workSummary)}</p></div>
                  <div className="analysis-columns">
                    <div className="analysis-block"><span className="analysis-kicker"><Compass aria-hidden="true" />Cómo trabajas</span><ul>{orientation.waysOfWorking.map((item) => <li key={item}>{qualitativeMaturityLanguage(item)}</li>)}</ul></div>
                    <div className="analysis-block"><span className="analysis-kicker"><Layers3 aria-hidden="true" />Lo que necesita tu perfil</span><ul>{orientation.profileNeeds.map((item) => <li key={item}>{qualitativeMaturityLanguage(item)}</li>)}</ul></div>
                    <div className="analysis-block guidance"><span className="analysis-kicker"><Sparkles aria-hidden="true" />Cómo seguir mejorando</span><ul>{orientation.developmentGuidance.map((item) => <li key={item}>{qualitativeMaturityLanguage(item)}</li>)}</ul></div>
                  </div>
                  {orientation.missingInformation.length > 0 && <div className="analysis-missing"><strong>Para afinar la orientación</strong><span>{orientation.missingInformation.map(qualitativeMaturityLanguage).join(' · ')}</span></div>}
                  <small>Orientación sugerida por IA; no valida tu situación real ni modifica tu categoría. Requiere contraste con tu líder y aprobación de People para cualquier cambio oficial · {orientation.updatedAt ? 'Actualizado ' + new Date(orientation.updatedAt).toLocaleDateString('es-CL', { day:'numeric', month:'short', year:'numeric' }) : ''}</small>
                </div>
              )}
            </section>

            <section className="panel history-panel" id="historial">
              <div className="panel-heading"><div><h2>{role === 'collaborator' ? 'Mi historial' : 'Historial de ' + firstName}</h2><p className="panel-subtitle">Contexto actual de desarrollo y la última orientación disponible.</p></div><History aria-hidden="true" className="history-icon" /></div>
              <div className="history-person"><span className="avatar">{initials}</span><div><strong>{profile?.fullName ?? 'Perfil en carga'}</strong><p>Perfil de desarrollo · {profile?.currentJobRole ?? 'Rol por completar'}</p></div><span className="history-ai"><Bot aria-hidden="true" /> Orientación asistida por IA</span></div>
              <div className="history-orientation" aria-live="polite">{orientation ? <><div><span className="history-maturity-message">{maturityMessage}</span><small>Orientación cualitativa · confianza {confidenceLabels[orientation.maturityConfidence]}</small></div><p>{displayedMaturitySummary}</p><small>Resumen basado en las tareas declaradas y sus estados de revisión. Es una orientación para conversar con el líder; no modifica ninguna categoría oficial.</small></> : <><div><span className="history-pending">Sin orientación vigente</span><small>Orientación cualitativa</small></div><p>Cuando exista un análisis, aquí se explicará de forma breve cómo las tareas registradas se relacionan con la orientación de desarrollo.</p></>}</div>
            </section>

            <section className="panel career-panel career-explorer" id="ruta" data-family={mapFamily?.id}>
              <div className="panel-heading">
                <div><h2>Explora el mapa de carrera</h2><p className="panel-subtitle">Recorre familias, rutas y roles para entender qué cambia entre una posición y la siguiente.</p></div>
                <span className="model-badge">{CAREER_MODEL_VERSION}</span>
              </div>
              <div className="map-controls">
                <label>Familia de talento
                  <select value={effectiveMapFamilyId} onChange={(event) => { setMapFamilyId(event.target.value); setMapTrackId(''); setMapRoleId(''); }}>
                    {careerFamilies.map((family) => <option key={family.id} value={family.id}>{family.label}</option>)}
                  </select>
                </label>
                <label>Ruta profesional
                  <select value={effectiveMapTrackId} onChange={(event) => { setMapTrackId(event.target.value); setMapRoleId(''); }}>
                    {(mapFamily?.tracks ?? []).map((track) => <option key={track.id} value={track.id}>{track.label}</option>)}
                  </select>
                </label>
                <div className="map-family-purpose"><span>Propósito de la familia</span><p>{mapFamily?.purpose}</p></div>
              </div>

              <div className="career-path" aria-label={'Ruta ' + (mapTrack?.label ?? '')}>
                {(mapTrack?.roles ?? []).map((step, index) => {
                  const isCurrent = step.id === currentCareerSelection?.role.id;
                  const isNext = step.id === nextCareerRole?.id;
                  const isSelected = step.id === exploredRole?.id;
                  return (
                    <button className={['career-step', isCurrent ? 'current' : '', isNext ? 'next' : '', isSelected ? 'selected' : ''].join(' ')} key={step.id} type="button" onClick={() => setMapRoleId(step.id)} aria-pressed={isSelected}>
                      <span className="step-dot">{isCurrent ? <Check aria-label="Rol actual" /> : index + 1}</span>
                      <span><small>{isCurrent ? 'Tu rol actual' : isNext ? 'Siguiente referencia' : `Etapa ${index + 1}`}</small><strong>{step.label}</strong></span>
                    </button>
                  );
                })}
              </div>

              {exploredRole && (
                <div className="map-role-detail">
                  <div className="map-role-heading">
                    <div><span className="map-eyebrow">Rol seleccionado</span><h3>{exploredRole.label}</h3></div>
                    <span className="source-badge">Fuente · pág. {exploredRole.sourcePage}</span>
                  </div>
                  <p className="role-mission">{exploredRole.mission ?? mapFamily?.purpose}</p>
                  <div className="role-detail-grid">
                    <div><span className="detail-title"><Layers3 aria-hidden="true" />Qué necesita este perfil</span><ul>{(exploredRole.profileNeeds ?? [`Revisar las responsabilidades completas de este rol en la página ${exploredRole.sourcePage} del mapa.`]).map((item) => <li key={item}>{item}</li>)}</ul></div>
                    <div><span className="detail-title"><Compass aria-hidden="true" />Cómo se reconoce en el trabajo</span><ul>{(exploredRole.waysOfWorking ?? ['Contrastar la misión del rol con tareas, decisiones, resultados y feedback observables.']).map((item) => <li key={item}>{item}</li>)}</ul></div>
                  </div>
                  {exploredRole.scopeSignals && <div className="role-scope-signals"><div><span className="detail-title"><Check aria-hidden="true" />Señales para conversar sobre el alcance del rol</span><p>Ejemplos que ayudan a contrastar el rol con el trabajo observado. No son una lista automática de requisitos ni una decisión de promoción.</p></div><ul>{exploredRole.scopeSignals.map((item) => <li key={item}>{item}</li>)}</ul><small>Fuente: Mapa de talento GDNe IBIOL · págs. {exploredRole.scopeSignalsSourcePages?.join(' y ')}.</small></div>}
                  {!exploredRole.mission && <p className="normalization-note">Esta ficha está disponible como referencia de ruta. Su detalle será ampliado durante la normalización completa del mapa.</p>}
                </div>
              )}
            </section>

          </div>
        </div>
      </section>

      <aside className="copilot" aria-label="Asistente de desarrollo">
        <div className="copilot-head"><span className="ai-orb"><Bot aria-hidden="true" /></span><span><strong>Guía de desarrollo</strong><small><i /> Disponible</small></span><button aria-label="Cerrar asistente"><X aria-hidden="true" /></button></div>
        <div className="copilot-body">
          <div className="assistant-message"><span className="mini-orb"><Sparkles aria-hidden="true" /></span><div><p>Puedo ayudarte a entender tu orientación actual, lo que necesita tu perfil de desarrollo y cómo convertir tu trabajo en ejemplos para conversar.</p><small>Mis respuestas son sugerencias y pueden no reflejar por completo tu caso real. No evalúo personas ni tomo decisiones de carrera: contrástalas con tu líder y con People antes de cualquier validación oficial.</small></div></div>
          {messages.map((message, index) => <div className="assistant-message followup" key={message + index}><span className="mini-orb"><Sparkles aria-hidden="true" /></span><div><p>{message}</p><small>Borrador de orientación: úsalo para guiar tu carrera, no como una validación. Requiere contraste con tu líder y aprobación de People para cualquier cambio oficial.</small></div></div>)}
          {isThinking && <div className="thinking">Revisando criterios y evidencias…</div>}
          <div className="suggestions"><button onClick={() => void askGuide('¿Por qué mi análisis propone esta orientación de desarrollo?')}>¿Por qué aparece esta orientación?</button><button onClick={() => void askGuide('¿Qué necesita mi perfil de desarrollo según el mapa de talento?')}>¿Qué necesita mi perfil de desarrollo?</button><button onClick={() => void askGuide('¿Cómo puedo mejorar a partir de las tareas que realizo?')}>¿Cómo puedo mejorar desde mi trabajo?</button></div>
        </div>
        <form className="prompt-box" onSubmit={(event) => { event.preventDefault(); void askGuide(prompt); }}>
          <label htmlFor="prompt">Conversa sobre tu desarrollo</label>
          <div><input id="prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Escribe tu pregunta..." /><button type="submit" disabled={isThinking} aria-label="Enviar mensaje"><Send aria-hidden="true" /></button></div>
          <small>La IA puede equivocarse: es una sugerencia para guiar tu carrera, no una validación de tu caso. Contrástala con tu líder y People.</small>
        </form>
      </aside>

      {evidenceOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setEvidenceOpen(false)}>
          <section className="evidence-modal" role="dialog" aria-modal="true" aria-labelledby="evidence-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head"><h2 id="evidence-title">Registra un avance observable</h2><button onClick={() => setEvidenceOpen(false)} aria-label="Cerrar"><X aria-hidden="true" /></button></div>
            <p>Describe hechos y resultados. Tu líder podrá revisarlos antes de asociarlos a un criterio.</p>
            <form onSubmit={submitEvidence}>
              <label>Título<input name="title" required minLength={3} maxLength={120} placeholder="Ej.: Lideré la revisión técnica del módulo" /></label>
              <label>Tipo<select name="evidenceType"><option value="achievement">Hito o resultado</option><option value="certification">Certificación</option><option value="feedback">Feedback</option><option value="learning">Aprendizaje</option></select></label>
              <label>Descripción<textarea name="description" maxLength={1200} rows={4} placeholder="Contexto, acción y resultado observable" /></label>
              <label>Archivo opcional<input name="file" type="file" accept=".pdf,.png,.jpg,.jpeg" /><small>PDF, PNG o JPG · máximo 10 MB</small></label>
              {evidenceError && <p className="form-error" role="alert">{evidenceError}</p>}
              <button className="modal-submit" type="submit">{evidenceSaved ? <><Check aria-hidden="true" /> Evidencia registrada</> : 'Enviar a revisión'}</button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
