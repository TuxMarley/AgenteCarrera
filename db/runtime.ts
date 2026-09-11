import { createClient, type Client, type InStatement, type InValue } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

type RunResult = { rowsAffected:number; lastInsertRowid:bigint | undefined };

class PreparedQuery {
  constructor(private readonly client:Client, private readonly sql:string, private readonly args:InValue[] = []) {}

  bind(...args:unknown[]) {
    return new PreparedQuery(this.client, this.sql, args.map(normalizeValue));
  }

  toStatement():InStatement {
    return { sql:this.sql, args:this.args };
  }

  async first<T>() {
    const result = await this.client.execute(this.toStatement());
    return (result.rows[0] as unknown as T | undefined) ?? null;
  }

  async all<T = Record<string, unknown>>() {
    const result = await this.client.execute(this.toStatement());
    return { results:result.rows as unknown as T[] };
  }

  async run():Promise<RunResult> {
    const result = await this.client.execute(this.toStatement());
    return { rowsAffected:result.rowsAffected, lastInsertRowid:result.lastInsertRowid };
  }
}

class LibsqlDatabase {
  constructor(private readonly client:Client) {}

  prepare(sql:string) {
    return new PreparedQuery(this.client, sql);
  }

  batch(statements:PreparedQuery[]) {
    return this.client.batch(statements.map((statement) => statement.toStatement()), 'write');
  }
}

function normalizeValue(value:unknown):InValue {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean' || value instanceof Uint8Array || value instanceof ArrayBuffer || value instanceof Date) return value;
  if (value === undefined) return null;
  return String(value);
}

let client:Client | null = null;
let database:LibsqlDatabase | null = null;

function getClient() {
  if (client) return client;
  const remoteUrl = process.env.TURSO_DATABASE_URL?.trim();
  const isLocal = !remoteUrl && process.env.NODE_ENV !== 'production';
  if (!remoteUrl && !isLocal) throw new Error('Falta configurar TURSO_DATABASE_URL para la base de datos de Netlify.');

  let url = remoteUrl;
  if (isLocal) {
    const dataDirectory = path.join(process.cwd(), '.data');
    mkdirSync(dataDirectory, { recursive:true });
    url = `file:${path.join(dataDirectory, 'career-agent.db').replaceAll('\\', '/')}`;
  }
  client = createClient({ url:url!, authToken:process.env.TURSO_AUTH_TOKEN || undefined, intMode:'number' });
  return client;
}

function getDatabase() {
  database ??= new LibsqlDatabase(getClient());
  return database;
}

const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, auth_user_id TEXT NOT NULL UNIQUE, email TEXT NOT NULL UNIQUE, full_name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('collaborator','leader','admin')), manager_id TEXT, current_job_role TEXT NOT NULL, official_category TEXT, orientative_band TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id)`,
  `CREATE TABLE IF NOT EXISTS career_profiles (user_id TEXT PRIMARY KEY, declared_job_role TEXT NOT NULL, work_context TEXT NOT NULL, development_goal TEXT NOT NULL, validation_status TEXT NOT NULL DEFAULT 'pending_review', reviewed_by TEXT, reviewed_at INTEGER, leader_feedback TEXT, reviewer_private_observation TEXT, completed_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_career_profiles_updated ON career_profiles(updated_at)`,
  `CREATE TABLE IF NOT EXISTS competencies (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, model_version TEXT NOT NULL, UNIQUE(name, model_version))`,
  `CREATE TABLE IF NOT EXISTS user_competencies (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, competency_id TEXT NOT NULL, self_level INTEGER NOT NULL, leader_level INTEGER, target_level INTEGER NOT NULL, coverage_percent INTEGER NOT NULL, validation_status TEXT NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(user_id, competency_id))`,
  `CREATE INDEX IF NOT EXISTS idx_user_competencies_user_status ON user_competencies(user_id, validation_status)`,
  `CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, evidence_type TEXT NOT NULL, occurred_at INTEGER NOT NULL, validation_status TEXT NOT NULL, object_key TEXT, original_filename TEXT, content_type TEXT, size_bytes INTEGER, leader_feedback TEXT, reviewed_by TEXT, reviewed_at INTEGER, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_evidence_user_created ON evidence(user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_evidence_user_status ON evidence(user_id, validation_status)`,
  `CREATE TABLE IF NOT EXISTS work_activities (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('in_progress','completed')), started_at INTEGER, completed_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_work_activities_user_updated ON work_activities(user_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_work_activities_user_status ON work_activities(user_id, status)`,
  `CREATE TABLE IF NOT EXISTS action_items (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL, due_at INTEGER, leader_feedback TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_action_items_user_status ON action_items(user_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_action_items_due_at ON action_items(due_at)`,
  `CREATE TABLE IF NOT EXISTS career_events (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, actor_id TEXT NOT NULL, event_type TEXT NOT NULL, title TEXT NOT NULL, details TEXT NOT NULL, occurred_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_career_events_user_occurred ON career_events(user_id, occurred_at)`,
  `CREATE TABLE IF NOT EXISTS ai_guidance (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, prompt_category TEXT NOT NULL, response_summary TEXT NOT NULL, model TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_ai_guidance_user_created ON ai_guidance(user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, target_user_id TEXT NOT NULL, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, before_json TEXT, after_json TEXT, created_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_target_created ON audit_log(target_user_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS career_model_versions (id TEXT PRIMARY KEY, label TEXT NOT NULL UNIQUE, source_digest TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS profile_analyses (user_id TEXT PRIMARY KEY, current_role TEXT NOT NULL, next_role TEXT, analysis_json TEXT NOT NULL, model TEXT NOT NULL, model_version TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
];

const now = Date.now();
const seedStatements: Array<[string, unknown[]]> = [
  [`INSERT OR IGNORE INTO users (id, auth_user_id, email, full_name, role, manager_id, current_job_role, official_category, orientative_band, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['usr_new_collaborator','demo-new-collaborator','new.collaborator@example.com','Nueva persona','collaborator','usr_marcelo','',null,null,now,now]],
  [`INSERT OR IGNORE INTO users (id, auth_user_id, email, full_name, role, manager_id, current_job_role, official_category, orientative_band, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['usr_empty_collaborator','demo-empty-collaborator','empty.collaborator@example.com','Perfil inicial','collaborator','usr_marcelo','',null,null,now,now]],
  [`INSERT OR IGNORE INTO users (id, auth_user_id, email, full_name, role, manager_id, current_job_role, official_category, orientative_band, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['usr_javiera','demo-collaborator','javiera.perez@example.com','Javiera Pérez','collaborator','usr_marcelo','Software Engineer','Software Engineer','T2',now,now]],
  [`INSERT OR IGNORE INTO users (id, auth_user_id, email, full_name, role, manager_id, current_job_role, official_category, orientative_band, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['usr_marcelo','demo-leader','marcelo.soto@example.com','Marcelo Soto','leader',null,'Delivery Leader','Delivery Leader','T3',now,now]],
  [`INSERT OR IGNORE INTO users (id, auth_user_id, email, full_name, role, manager_id, current_job_role, official_category, orientative_band, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['usr_admin','demo-admin','talento@example.com','Equipo de Talento','admin',null,'Talent Admin',null,null,now,now]],
  [`INSERT OR IGNORE INTO competencies (id, name, description, model_version) VALUES (?, ?, ?, ?)`, ['cmp_software','Interacción con software','Desarrolla programas o componentes de software según requisitos y estándares.','GDNe-2026.1']],
  [`INSERT OR IGNORE INTO competencies (id, name, description, model_version) VALUES (?, ?, ?, ?)`, ['cmp_analytical','Pensamiento analítico','Analiza relaciones entre partes de una situación y establece vínculos causales.','GDNe-2026.1']],
  [`INSERT OR IGNORE INTO competencies (id, name, description, model_version) VALUES (?, ?, ?, ?)`, ['cmp_communication','Comunicación asertiva','Comunica con claridad, escucha y adapta el mensaje al contexto.','GDNe-2026.1']],
  [`INSERT OR IGNORE INTO user_competencies (id, user_id, competency_id, self_level, leader_level, target_level, coverage_percent, validation_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['uc_1','usr_javiera','cmp_software',2,2,3,72,'validated',now]],
  [`INSERT OR IGNORE INTO user_competencies (id, user_id, competency_id, self_level, leader_level, target_level, coverage_percent, validation_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['uc_2','usr_javiera','cmp_analytical',2,null,3,64,'pending',now]],
  [`INSERT OR IGNORE INTO user_competencies (id, user_id, competency_id, self_level, leader_level, target_level, coverage_percent, validation_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['uc_3','usr_javiera','cmp_communication',1,null,3,46,'self_assessed',now]],
  // Competencias de muestra para el perfil vacío (usr_empty_collaborator) — autoevaluación inicial sin validación del líder
  [`INSERT OR IGNORE INTO user_competencies (id, user_id, competency_id, self_level, leader_level, target_level, coverage_percent, validation_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['uc_e1','usr_empty_collaborator','cmp_software',1,null,3,30,'self_assessed',now]],
  [`INSERT OR IGNORE INTO user_competencies (id, user_id, competency_id, self_level, leader_level, target_level, coverage_percent, validation_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['uc_e2','usr_empty_collaborator','cmp_analytical',1,null,3,25,'self_assessed',now]],
  [`INSERT OR IGNORE INTO user_competencies (id, user_id, competency_id, self_level, leader_level, target_level, coverage_percent, validation_status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['uc_e3','usr_empty_collaborator','cmp_communication',1,null,2,35,'self_assessed',now]],
  [`INSERT OR IGNORE INTO action_items (id, user_id, title, description, source, status, due_at, leader_feedback, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['act_1','usr_javiera','Liderar una revisión técnica de alcance acotado','Practicar síntesis técnica y comunicación de decisiones con el equipo.','ai_draft','pending_leader',now + 45*86400000,null,now,now]],
  [`INSERT OR IGNORE INTO evidence (id, user_id, title, description, evidence_type, occurred_at, validation_status, leader_feedback, reviewed_by, reviewed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['ev_1','usr_javiera','Certificación Cloud Fundamentals','Certificación completada y compartida con el equipo.','certification',now - 30*86400000,'validated','Certificación registrada como antecedente de aprendizaje.','usr_marcelo',now - 29*86400000,now - 29*86400000]],
  // Datos ficticios para que el perfil de demostración contenga ejemplos suficientes y trazables.
  [`INSERT OR IGNORE INTO evidence (id, user_id, title, description, evidence_type, occurred_at, validation_status, leader_feedback, reviewed_by, reviewed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['ev_demo_tests','usr_javiera','Resultado de pruebas automatizadas de regresión','Muestra ficticia: se incorporaron escenarios críticos de registro y validaciones de borde. La suite quedó documentada para que el equipo pueda ejecutarla en cada revisión de cambios.','achievement',now - 18*86400000,'pending',null,null,null,now - 18*86400000]],
  [`INSERT OR IGNORE INTO evidence (id, user_id, title, description, evidence_type, occurred_at, validation_status, leader_feedback, reviewed_by, reviewed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['ev_demo_feedback','usr_javiera','Feedback ficticio de revisión técnica','Muestra ficticia: en una revisión técnica se destacó la claridad al explicar alternativas, riesgos y la recomendación. Como foco de mejora se acordó hacer más visibles los criterios de estimación.','feedback',now - 14*86400000,'pending',null,null,null,now - 14*86400000]],
  [`INSERT OR IGNORE INTO evidence (id, user_id, title, description, evidence_type, occurred_at, validation_status, leader_feedback, reviewed_by, reviewed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['ev_demo_observability','usr_javiera','Aprendizaje aplicado sobre observabilidad','Muestra ficticia: se investigaron métricas y trazas para diagnosticar una incidencia, se documentó el procedimiento y se propusieron alertas básicas para detectar el mismo patrón antes de que afecte una prueba.','learning',now - 10*86400000,'pending',null,null,null,now - 10*86400000]],
  [`INSERT OR IGNORE INTO career_events (id, user_id, actor_id, event_type, title, details, occurred_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, ['evt_1','usr_javiera','usr_marcelo','category_change','Promoción a Software Engineer','Cambio validado por líder y Talento.',1759276800000]],
  [`INSERT OR IGNORE INTO career_model_versions (id, label, source_digest, status, created_at) VALUES (?, ?, ?, ?, ?)`, ['model_1','GDNe-2026.1','Mapa de talento GDNe + Growth Mindset','active',now]],
  [`INSERT OR IGNORE INTO career_profiles (user_id, declared_job_role, work_context, development_goal, validation_status, reviewed_by, reviewed_at, leader_feedback, reviewer_private_observation, completed_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['usr_javiera','Software Engineer','Muestra ficticia: trabaja en un equipo ágil que mantiene y evoluciona una plataforma digital de atención. Desarrolla funcionalidades de punta a punta, participa en refinamientos, estima historias, realiza pruebas automatizadas y revisiones de código. Coordina decisiones técnicas con producto, QA y otros desarrolladores, y documenta riesgos, acuerdos y aprendizajes para dar trazabilidad a cada entrega.','Muestra ficticia: fortalecer la autonomía para liderar funcionalidades de alcance acotado, mejorar la comunicación de decisiones técnicas con audiencias no técnicas y profundizar en calidad, pruebas automatizadas y observabilidad.','validated','usr_marcelo',now - 9*86400000,'Perfil revisado como punto de partida para la conversación de desarrollo.',null,now - 60*86400000,now - 10*86400000]],
  [`INSERT OR IGNORE INTO work_activities (id, user_id, title, description, status, started_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['task_1','usr_javiera','Implementar una funcionalidad de producto','Desarrollo de un componente de software a partir de requisitos acordados con el equipo.','completed',now - 35*86400000,now - 20*86400000,now - 35*86400000,now - 20*86400000]],
  [`INSERT OR IGNORE INTO work_activities (id, user_id, title, description, status, started_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['task_2','usr_javiera','Preparar una revision tecnica','Sintetizar decisiones y riesgos para conversar una propuesta con el equipo.','in_progress',now - 7*86400000,null,now - 7*86400000,now - 2*86400000]],
  [`INSERT OR IGNORE INTO work_activities (id, user_id, title, description, status, started_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['task_demo_tests','usr_javiera','Automatizar pruebas de regresión del flujo de registro','Muestra ficticia: se diseñaron pruebas automatizadas para escenarios críticos de registro, se identificaron casos límite junto a QA y se documentaron los criterios de aceptación para integrarlos a la revisión de cambios.','completed',now - 22*86400000,now - 18*86400000,now - 22*86400000,now - 18*86400000]],
  [`INSERT OR IGNORE INTO work_activities (id, user_id, title, description, status, started_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['task_demo_estimation','usr_javiera','Estimar y planificar una mejora de rendimiento','Muestra ficticia: se descompuso el trabajo técnico, se estimó esfuerzo con el equipo, se explicitaron dependencias y se propuso una entrega incremental para reducir el riesgo de implementación.','completed',now - 17*86400000,now - 13*86400000,now - 17*86400000,now - 13*86400000]],
  [`INSERT OR IGNORE INTO work_activities (id, user_id, title, description, status, started_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['task_demo_incident','usr_javiera','Resolver una incidencia en ambiente de pruebas','Muestra ficticia: se analizaron registros y trazas de una incidencia reportada por QA, se aisló la causa en una validación de datos y se propuso una corrección con pruebas asociadas.','completed',now - 12*86400000,now - 9*86400000,now - 12*86400000,now - 9*86400000]],
  [`INSERT OR IGNORE INTO work_activities (id, user_id, title, description, status, started_at, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, ['task_demo_integration','usr_javiera','Documentar decisiones para una nueva integración','Muestra ficticia: se prepara una propuesta técnica para una integración con un servicio externo, incluyendo alternativas, supuestos, riesgos, criterios de seguridad y una recomendación inicial para revisar con el equipo.','in_progress',now - 6*86400000,null,now - 6*86400000,now - 2*86400000]],
];

let initialized = false;
export async function ensureDatabase() {
  if (initialized) return;
  const db = getDatabase();
  await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
  const profileColumns = await db.prepare('PRAGMA table_info(career_profiles)').all<{ name:string }>();
  const existingProfileColumns = new Set(profileColumns.results.map((column) => column.name));
  const profileColumnMigrations = [
    !existingProfileColumns.has('validation_status') ? "ALTER TABLE career_profiles ADD COLUMN validation_status TEXT NOT NULL DEFAULT 'pending_review'" : null,
    !existingProfileColumns.has('reviewed_by') ? 'ALTER TABLE career_profiles ADD COLUMN reviewed_by TEXT' : null,
    !existingProfileColumns.has('reviewed_at') ? 'ALTER TABLE career_profiles ADD COLUMN reviewed_at INTEGER' : null,
    !existingProfileColumns.has('leader_feedback') ? 'ALTER TABLE career_profiles ADD COLUMN leader_feedback TEXT' : null,
    !existingProfileColumns.has('reviewer_private_observation') ? 'ALTER TABLE career_profiles ADD COLUMN reviewer_private_observation TEXT' : null,
  ].filter((statement): statement is string => Boolean(statement));
  if (profileColumnMigrations.length) await db.batch(profileColumnMigrations.map((statement) => db.prepare(statement)));
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_career_profiles_status ON career_profiles(validation_status)').run();
  const evidenceColumns = await db.prepare('PRAGMA table_info(evidence)').all<{ name:string }>();
  const existingEvidenceColumns = new Set(evidenceColumns.results.map((column) => column.name));
  const evidenceColumnMigrations = [
    !existingEvidenceColumns.has('leader_feedback') ? 'ALTER TABLE evidence ADD COLUMN leader_feedback TEXT' : null,
    !existingEvidenceColumns.has('reviewed_by') ? 'ALTER TABLE evidence ADD COLUMN reviewed_by TEXT' : null,
    !existingEvidenceColumns.has('reviewed_at') ? 'ALTER TABLE evidence ADD COLUMN reviewed_at INTEGER' : null,
  ].filter((statement): statement is string => Boolean(statement));
  if (evidenceColumnMigrations.length) await db.batch(evidenceColumnMigrations.map((statement) => db.prepare(statement)));
  await db.batch(seedStatements.map(([statement, params]) => db.prepare(statement).bind(...params)));
  await db.prepare('PRAGMA optimize').run();
  initialized = true;
}
export function rawDb() { return getDatabase(); }
