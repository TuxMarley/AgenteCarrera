export const CAREER_MODEL_VERSION = 'GDNe-2026.1';
export const CAREER_MODEL_SOURCE = 'Mapa de talento GDNe IBIOL.pdf';

export type CareerRole = {
  id:string;
  label:string;
  sourcePage:number;
  mission?:string;
  profileNeeds?:string[];
  waysOfWorking?:string[];
  scopeSignals?:string[];
  scopeSignalsSourcePages?:number[];
};

export type CareerTrack = {
  id:string;
  label:string;
  sourcePage:number;
  roles:CareerRole[];
};

export type CareerFamily = {
  id:string;
  label:string;
  canonicalLabel:string;
  sourcePage:number;
  purpose:string;
  tracks:CareerTrack[];
};

export const careerFamilies:CareerFamily[] = [
  {
    id:'engineering',
    label:'Desarrollo',
    canonicalLabel:'Engineering',
    sourcePage:8,
    purpose:'Desplegar, optimizar, agilizar o automatizar soluciones tecnológicas aportando conocimiento técnico según las necesidades del cliente.',
    tracks:[{
      id:'software-engineering',
      label:'Ingeniería de software',
      sourcePage:8,
      roles:[
        {
          id:'rising-software-engineer', label:'Rising Software Engineer', sourcePage:10,
          mission:'Construye o implanta parte de la solución mientras aprende la tecnología, la metodología, el producto y las herramientas necesarias.',
          profileNeeds:['Desarrollar componentes siguiendo la metodología y el plan acordado.','Probar, depurar y documentar avances, incidencias y entregas.','Reportar avances y bloqueos, comprendiendo el contexto del cliente.'],
          waysOfWorking:['Aprende con feedback frecuente y apoyo del equipo.','Trabaja con trazabilidad dentro de un alcance definido.','Construye autonomía mediante práctica, formación y colaboración.'],
        },
        {
          id:'software-engineer', label:'Software Engineer', sourcePage:12,
          mission:'Define, construye, desarrolla, implanta y prueba la solución aplicando la tecnología, la metodología, el producto y las herramientas necesarias.',
          profileNeeds:['Diseñar, construir, probar y documentar componentes con calidad y trazabilidad.','Resolver problemas del ámbito y estimar con precisión el esfuerzo de sus tareas.','Comunicar resultados, comprender el contexto del cliente y apoyar técnicamente al equipo.'],
          waysOfWorking:['Se autoorganiza y aplica estándares y metodología sin perder la revisión crítica.','Convierte requisitos en soluciones equilibradas, seguras y viables.','Comparte conocimiento y orienta su trabajo al valor para el cliente.'],
        },
        {
          id:'senior-software-engineer', label:'Senior Software Engineer', sourcePage:15,
          mission:'Desarrolla y prueba soluciones con conocimiento profundo, difunde mejores prácticas y lidera la mejora continua y la eficiencia en su especialidad.',
          profileNeeds:['Supervisar soluciones seguras, escalables y consistentes con las mejores prácticas.','Estructurar y resolver problemas complejos, promoviendo calidad, metodología y productividad.','Sustentar decisiones, asesorar y transferir conocimiento al equipo.'],
          waysOfWorking:['Actúa con autonomía sostenida y criterio técnico profundo.','Hace visible su razonamiento y genera confianza con argumentos sólidos.','Eleva la capacidad del equipo mediante guía, formación y mejora continua.'],
          scopeSignals:[
            'Guía y supervisa el diseño, la construcción, las pruebas y la documentación de elementos estructurales, cuidando calidad y consistencia.',
            'Diagnostica y estructura problemas complejos de su especialidad; estima el esfuerzo técnico con criterios que fortalecen la planificación.',
            'Sustenta conclusiones o propuestas con argumentos sólidos, conectándolas con el contexto y valor para el cliente.',
            'Difunde mejores prácticas y transfiere conocimiento mediante asesoramiento, formación interna o acompañamiento técnico al equipo.',
          ],
          scopeSignalsSourcePages:[15,16],
        },
        {
          id:'lead-software-engineer', label:'Lead Software Engineer', sourcePage:18,
          mission:'Asume la responsabilidad de la solución técnica y lidera al equipo para construirla y aplicarla desde su conocimiento.',
          profileNeeds:['Garantizar viabilidad, seguridad, sostenibilidad y calidad integral de la solución.','Liderar la construcción, las pruebas y el marco metodológico con el equipo.','Representar el criterio técnico ante cliente y desarrollar capacidades del equipo.'],
          waysOfWorking:['Delega, alinea y crea condiciones para la autoorganización.','Anticipa riesgos y conecta decisiones técnicas con valor y planificación.','Promueve aprendizaje continuo y adopción responsable de nuevas tecnologías.'],
        },
        {
          id:'expert-software-engineer', label:'Expert Software Engineer', sourcePage:21,
          mission:'Lidera soluciones técnicas complejas como referente de su ámbito, alineando el conocimiento profundo con la estrategia.',
          profileNeeds:['Definir cómo abordar desarrollos complejos y asegurar soluciones sostenibles de alto valor.','Actuar como referente técnico ante clientes, stakeholders y otras unidades.','Difundir conocimiento diferencial y guiar la evolución técnica de equipos y prácticas.'],
          waysOfWorking:['Conecta decisiones tecnológicas con estrategia, sostenibilidad y valor de negocio.','Influye más allá del proyecto mediante asesoramiento y formación avanzada.','Lidera con evidencia, criterio y una visión de largo plazo.'],
        },
      ],
    }],
  },
  {
    id:'enterprise-solutions-engineering',
    label:'Técnica de plataforma',
    canonicalLabel:'Enterprise Solutions Engineering',
    sourcePage:25,
    purpose:'Desplegar y evolucionar soluciones sobre plataformas de mercado, integrando capacidades técnicas, automatización y necesidades del cliente.',
    tracks:[{
      id:'platform-solutions-engineering',
      label:'Ingeniería de soluciones de plataforma',
      sourcePage:25,
      roles:[
        { id:'rising-enterprise-software-solutions-engineer', label:'Rising Enterprise Software Solutions Engineer', sourcePage:26 },
        { id:'enterprise-software-solutions-engineer', label:'Enterprise Software Solutions Engineer', sourcePage:28 },
        { id:'senior-enterprise-software-solutions-engineer', label:'Senior Enterprise Software Solutions Engineer', sourcePage:31 },
        { id:'lead-enterprise-software-solutions-engineer', label:'Lead Enterprise Software Solutions Engineer', sourcePage:34 },
        { id:'expert-enterprise-software-solutions-engineer', label:'Expert Enterprise Software Solutions Engineer', sourcePage:37 },
      ],
    }],
  },
  {
    id:'enterprise-solutions-analysis',
    label:'Funcional de plataforma',
    canonicalLabel:'Enterprise Solutions Analysis',
    sourcePage:77,
    purpose:'Conocer una plataforma y los procesos del cliente para adaptar sus capacidades y funcionalidades a las necesidades del negocio.',
    tracks:[{
      id:'platform-functional-analysis',
      label:'Análisis funcional de soluciones de plataforma',
      sourcePage:77,
      roles:[
        { id:'rising-enterprise-solutions-functional-analyst', label:'Rising Enterprise Solutions Functional Analyst', sourcePage:78 },
        { id:'enterprise-solutions-functional-analyst', label:'Enterprise Solutions Functional Analyst', sourcePage:80 },
        { id:'senior-enterprise-solutions-functional-analyst', label:'Senior Enterprise Solutions Functional Analyst', sourcePage:82 },
        { id:'lead-enterprise-solutions-functional-analyst', label:'Lead Enterprise Solutions Functional Analyst', sourcePage:85 },
        { id:'expert-enterprise-solutions-functional-analyst', label:'Expert Enterprise Solutions Functional Analyst', sourcePage:88 },
      ],
    }],
  },
  {
    id:'quality-assurance',
    label:'QA',
    canonicalLabel:'QA',
    sourcePage:40,
    purpose:'Definir, automatizar y ejecutar pruebas para asegurar los estándares de calidad durante el desarrollo de una solución.',
    tracks:[
      {
        id:'software-quality',
        label:'Calidad de software',
        sourcePage:40,
        roles:[
          { id:'software-quality-analyst', label:'Software Quality Analyst', sourcePage:41 },
          { id:'senior-software-quality', label:'Senior Software Quality', sourcePage:43 },
          { id:'lead-software-quality', label:'Lead Software Quality', sourcePage:46 },
          { id:'expert-software-quality', label:'Expert Software Quality', sourcePage:49 },
        ],
      },
      {
        id:'technical-software-quality',
        label:'Calidad técnica de software',
        sourcePage:40,
        roles:[
          { id:'technical-software-quality-role', label:'Technical Software Quality', sourcePage:52 },
          { id:'senior-technical-software-quality', label:'Senior Technical Software Quality', sourcePage:55 },
          { id:'lead-technical-software-quality', label:'Lead Technical Software Quality', sourcePage:58 },
          { id:'expert-technical-software-quality', label:'Expert Technical Software Quality', sourcePage:61 },
        ],
      },
    ],
  },
  {
    id:'architecture',
    label:'Arquitectura',
    canonicalLabel:'Architecture',
    sourcePage:65,
    purpose:'Construir y evolucionar arquitecturas de extremo a extremo, asegurando marcos y métodos adecuados para resolver necesidades del cliente.',
    tracks:[{
      id:'software-architecture',
      label:'Arquitectura de software',
      sourcePage:65,
      roles:[
        { id:'software-architect', label:'Software Architect', sourcePage:66 },
        { id:'lead-software-architect', label:'Lead Software Architect', sourcePage:69 },
        { id:'expert-software-architect', label:'Expert Software Architect', sourcePage:73 },
      ],
    }],
  },
  {
    id:'agile',
    label:'Agile',
    canonicalLabel:'Agile',
    sourcePage:91,
    purpose:'Acompañar metodológicamente a los equipos para trabajar de acuerdo con valores, principios y prácticas ágiles.',
    tracks:[{
      id:'delivery-agile',
      label:'Facilitación agile del delivery',
      sourcePage:91,
      roles:[
        { id:'delivery-agile-facilitator', label:'Delivery Agile Facilitator', sourcePage:92 },
        { id:'delivery-agile-team-facilitator', label:'Delivery Agile Team Facilitator', sourcePage:95 },
      ],
    }],
  },
  {
    id:'project-service-management',
    label:'Gestión de proyectos y servicios',
    canonicalLabel:'Proj & Service Management',
    sourcePage:98,
    purpose:'Liderar la implantación, ejecución y evolución de proyectos o servicios, incluyendo equipo, contrato y relación con el cliente.',
    tracks:[{
      id:'delivery-management',
      label:'Gestión del delivery',
      sourcePage:98,
      roles:[
        { id:'delivery-lead', label:'Delivery Lead', sourcePage:99 },
        { id:'delivery-leader', label:'Delivery Leader', sourcePage:102 },
        { id:'senior-delivery-leader', label:'Senior Delivery Leader', sourcePage:105 },
      ],
    }],
  },
  {
    id:'professional-services-management',
    label:'Gestión de servicios profesionales',
    canonicalLabel:'Professional Services Management',
    sourcePage:108,
    purpose:'Gestionar las necesidades y la asignación eficiente de talento para asegurar la ejecución de proyectos y servicios y la relación con el cliente.',
    tracks:[{
      id:'professional-services',
      label:'Gestión de talento en servicios',
      sourcePage:108,
      roles:[
        { id:'delivery-team-leader', label:'Delivery Team Leader', sourcePage:109 },
        { id:'senior-delivery-team-leader', label:'Senior Delivery Team Leader', sourcePage:112 },
      ],
    }],
  },
];

export type CareerRoleSelection = {
  family:CareerFamily;
  track:CareerTrack;
  role:CareerRole;
};

export function getCareerRoleSelection(roleId:string):CareerRoleSelection | undefined {
  for (const family of careerFamilies) {
    for (const track of family.tracks) {
      const role = track.roles.find((item) => item.id === roleId);
      if (role) return { family, track, role };
    }
  }
  return undefined;
}

export function getCareerRoleSelectionByLabel(label:string|null|undefined):CareerRoleSelection | undefined {
  if (!label) return undefined;
  for (const family of careerFamilies) {
    for (const track of family.tracks) {
      const role = track.roles.find((item) => item.label === label);
      if (role) return { family, track, role };
    }
  }
  return undefined;
}

/** Devuelve el siguiente rol en la misma ruta de carrera, o undefined si es el último. */
export function getNextRole(roleId:string):{ role:CareerRole; track:CareerTrack; family:CareerFamily } | undefined {
  for (const family of careerFamilies) {
    for (const track of family.tracks) {
      const idx = track.roles.findIndex((item) => item.id === roleId);
      if (idx !== -1 && idx + 1 < track.roles.length) {
        return { role:track.roles[idx + 1], track, family };
      }
    }
  }
  return undefined;
}
