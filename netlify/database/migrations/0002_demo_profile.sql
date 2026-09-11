-- Datos ficticios para una demostración de producto. No representan personas ni resultados reales.
INSERT INTO users (id, auth_user_id, email, full_name, role, manager_id, current_job_role, official_category, orientative_band, created_at, updated_at) VALUES
  ('usr_javiera', 'demo-collaborator', 'javiera.perez@example.com', 'Javiera Pérez', 'collaborator', 'usr_marcelo', 'Software Engineer', 'Software Engineer', 'T2', 1782603234086, 1782603234086),
  ('usr_marcelo', 'demo-leader', 'marcelo.soto@example.com', 'Marcelo Soto', 'leader', NULL, 'Delivery Leader', 'Delivery Leader', 'T3', 1782603234086, 1782603234086),
  ('usr_admin', 'demo-admin', 'talento@example.com', 'Equipo de Talento', 'admin', NULL, 'Talent Admin', NULL, NULL, 1782603234086, 1782603234086),
  ('usr_empty_collaborator', 'demo-empty-collaborator', 'empty.collaborator@example.com', 'Perfil inicial', 'collaborator', 'usr_marcelo', '', NULL, NULL, 1782603234086, 1782603234086)
ON CONFLICT (id) DO NOTHING;

INSERT INTO competencies (id, name, description, model_version) VALUES
  ('cmp_software', 'Interacción con software', 'Desarrolla programas o componentes de software según requisitos y estándares.', 'GDNe-2026.1'),
  ('cmp_analytical', 'Pensamiento analítico', 'Analiza relaciones entre partes de una situación y establece vínculos causales.', 'GDNe-2026.1'),
  ('cmp_communication', 'Comunicación asertiva', 'Comunica con claridad, escucha y adapta el mensaje al contexto.', 'GDNe-2026.1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_competencies (id, user_id, competency_id, self_level, leader_level, target_level, coverage_percent, validation_status, updated_at) VALUES
  ('uc_1', 'usr_javiera', 'cmp_software', 2, 2, 3, 72, 'validated', 1782603234086),
  ('uc_2', 'usr_javiera', 'cmp_analytical', 2, NULL, 3, 64, 'pending', 1782603234086),
  ('uc_3', 'usr_javiera', 'cmp_communication', 1, NULL, 3, 46, 'self_assessed', 1782603234086),
  ('uc_e1', 'usr_empty_collaborator', 'cmp_software', 1, NULL, 3, 30, 'self_assessed', 1782603234086),
  ('uc_e2', 'usr_empty_collaborator', 'cmp_analytical', 1, NULL, 3, 25, 'self_assessed', 1782603234086),
  ('uc_e3', 'usr_empty_collaborator', 'cmp_communication', 1, NULL, 2, 35, 'self_assessed', 1782603234086)
ON CONFLICT (id) DO NOTHING;

INSERT INTO career_profiles (user_id, declared_job_role, work_context, development_goal, validation_status, reviewed_by, reviewed_at, leader_feedback, reviewer_private_observation, completed_at, updated_at) VALUES
  ('usr_javiera', 'Software Engineer', 'Muestra ficticia: trabaja en un equipo ágil que mantiene y evoluciona una plataforma digital de atención. Desarrolla funcionalidades de punta a punta, participa en refinamientos, estima historias, realiza pruebas automatizadas y revisiones de código. Coordina decisiones técnicas con producto, QA y otros desarrolladores, y documenta riesgos, acuerdos y aprendizajes para dar trazabilidad a cada entrega.', 'Muestra ficticia: fortalecer la autonomía para liderar funcionalidades de alcance acotado, mejorar la comunicación de decisiones técnicas con audiencias no técnicas y profundizar en calidad, pruebas automatizadas y observabilidad.', 'validated', 'usr_marcelo', 1781825634086, 'Perfil revisado como punto de partida para la conversación de desarrollo.', NULL, 1777419234086, 1781739234086)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO evidence (id, user_id, title, description, evidence_type, occurred_at, validation_status, leader_feedback, reviewed_by, reviewed_at, created_at) VALUES
  ('ev_1', 'usr_javiera', 'Certificación Cloud Fundamentals', 'Certificación completada y compartida con el equipo.', 'certification', 1780011234086, 'validated', 'Certificación registrada como antecedente de aprendizaje.', 'usr_marcelo', 1780097634086, 1780097634086),
  ('ev_demo_tests', 'usr_javiera', 'Resultado de pruebas automatizadas de regresión', 'Muestra ficticia: se incorporaron escenarios críticos de registro y validaciones de borde. La suite quedó documentada para que el equipo pueda ejecutarla en cada revisión de cambios.', 'achievement', 1781048034086, 'pending', NULL, NULL, NULL, 1781048034086),
  ('ev_demo_feedback', 'usr_javiera', 'Feedback ficticio de revisión técnica', 'Muestra ficticia: en una revisión técnica se destacó la claridad al explicar alternativas, riesgos y la recomendación. Como foco de mejora se acordó hacer más visibles los criterios de estimación.', 'feedback', 1781393634086, 'pending', NULL, NULL, NULL, 1781393634086),
  ('ev_demo_observability', 'usr_javiera', 'Aprendizaje aplicado sobre observabilidad', 'Muestra ficticia: se investigaron métricas y trazas para diagnosticar una incidencia, se documentó el procedimiento y se propusieron alertas básicas para detectar el mismo patrón antes de que afecte una prueba.', 'learning', 1781739234086, 'pending', NULL, NULL, NULL, 1781739234086)
ON CONFLICT (id) DO NOTHING;

INSERT INTO work_activities (id, user_id, title, description, status, started_at, completed_at, created_at, updated_at) VALUES
  ('task_1', 'usr_javiera', 'Implementar una funcionalidad de producto', 'Desarrollo de un componente de software a partir de requisitos acordados con el equipo.', 'completed', 1779579234086, 1780875234086, 1779579234086, 1780875234086),
  ('task_2', 'usr_javiera', 'Preparar una revisión técnica', 'Sintetizar decisiones y riesgos para conversar una propuesta con el equipo.', 'in_progress', 1781998434086, NULL, 1781998434086, 1782430434086),
  ('task_demo_tests', 'usr_javiera', 'Automatizar pruebas de regresión del flujo de registro', 'Muestra ficticia: se diseñaron pruebas automatizadas para escenarios críticos de registro, se identificaron casos límite junto a QA y se documentaron los criterios de aceptación para integrarlos a la revisión de cambios.', 'completed', 1780702434086, 1781048034086, 1780702434086, 1781048034086),
  ('task_demo_estimation', 'usr_javiera', 'Estimar y planificar una mejora de rendimiento', 'Muestra ficticia: se descompuso el trabajo técnico, se estimó esfuerzo con el equipo, se explicitaron dependencias y se propuso una entrega incremental para reducir el riesgo de implementación.', 'completed', 1781134434086, 1781480034086, 1781134434086, 1781480034086),
  ('task_demo_incident', 'usr_javiera', 'Resolver una incidencia en ambiente de pruebas', 'Muestra ficticia: se analizaron registros y trazas de una incidencia reportada por QA, se aisló la causa en una validación de datos y se propuso una corrección con pruebas asociadas.', 'completed', 1781566434086, 1781825634086, 1781566434086, 1781825634086),
  ('task_demo_integration', 'usr_javiera', 'Documentar decisiones para una nueva integración', 'Muestra ficticia: se prepara una propuesta técnica para una integración con un servicio externo, incluyendo alternativas, supuestos, riesgos, criterios de seguridad y una recomendación inicial para revisar con el equipo.', 'in_progress', 1782084834086, NULL, 1782084834086, 1782430434086)
ON CONFLICT (id) DO NOTHING;

INSERT INTO career_events (id, user_id, actor_id, event_type, title, details, occurred_at) VALUES
  ('evt_1', 'usr_javiera', 'usr_marcelo', 'category_change', 'Promoción a Software Engineer', 'Cambio validado por líder y Talento.', 1759276800000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO career_model_versions (id, label, source_digest, status, created_at) VALUES
  ('model_1', 'GDNe-2026.1', 'Mapa de talento GDNe + Growth Mindset', 'active', 1782603234086)
ON CONFLICT (id) DO NOTHING;

INSERT INTO profile_analyses (user_id, current_role, next_role, analysis_json, model, model_version, created_at, updated_at) VALUES
  ('usr_javiera', 'Software Engineer', 'Senior Software Engineer', $$ {"maturityBand":"T2","maturityConfidence":"medium","maturitySummary":"Las tareas declaradas muestran autonomía creciente al desarrollar funcionalidades, automatizar pruebas, estimar trabajo y resolver incidencias con trazabilidad. Esta es una orientación para conversar: conviene contrastar con el líder la consistencia de los resultados y el alcance de autonomía en situaciones similares.","workSummary":"El perfil ficticio reúne trabajo de desarrollo, calidad, estimación, diagnóstico de incidencias y documentación de decisiones. Incluye ejemplos declarados de colaboración con QA y producto, además de aprendizajes de observabilidad.","waysOfWorking":["Documenta decisiones, riesgos y acuerdos para dar trazabilidad.","Colabora con QA en criterios de aceptación y escenarios límite.","Analiza incidencias con registros y trazas antes de proponer una corrección."],"profileNeeds":["Diseñar, construir, probar y documentar componentes con calidad y trazabilidad.","Resolver problemas del ámbito y estimar con precisión el esfuerzo de sus tareas.","Comunicar resultados y apoyar técnicamente al equipo."],"developmentGuidance":["Contrastar con el líder la autonomía observada en una funcionalidad de principio a fin.","Registrar resultados verificables de las pruebas automatizadas y de la corrección de incidencias.","Practicar la síntesis de decisiones técnicas para audiencias no técnicas."],"missingInformation":["Feedback validado sobre el impacto sostenido de las tareas.","Definición explícita del siguiente desafío profesional."],"humanValidationRequired":true} $$, 'demo-seed', 'GDNe-2026.1', 1782603234086, 1782603234086)
ON CONFLICT (user_id) DO NOTHING;
