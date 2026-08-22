/**
 * Generates the fictional incident dataset consumed by the app at
 * `public/mocks/incidents.mock.json`. Keeps the exact `Incident` shape from
 * `domain/models/incident.model.ts`, draws people from `mock-users.ts`, and
 * covers all 15 incident-type keys the domain uses (11 of them are exposed in
 * the current create-incident selector — see roadmap.md F2.3 for closing that
 * gap; this script only needs the full key set to exist in the data).
 *
 * Deterministic given the same run day (seeded PRNG), so repeat runs without
 * code changes reproduce the same dataset. Run with `npm run generate-mock-data`.
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MOCK_USERS } from '../src/lib/constants/mock-users';
import type {
  Coordinates,
  Incident,
  IncidentPriority,
  IncidentStatus,
  IncidentType,
  Media,
  Project,
  Tag,
  UserRef,
} from '../src/domain/models/incident.model';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INCIDENT_COUNT = 200;
const OUTPUT_PATH = resolve(__dirname, '../public/mocks/incidents.mock.json');

// ── Seeded PRNG (mulberry32) — reproducible output for a given seed ────────
function mulberry32(seed: number) {
  return function random() {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260615);

function randomInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}
function pickSome<T>(items: readonly T[], min: number, max: number): T[] {
  const n = Math.min(items.length, randomInt(min, max));
  const pool = [...items];
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rand() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}
function weightedPick<T>(entries: [T, number][]): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rand() * total;
  for (const [value, weight] of entries) {
    r -= weight;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}
function randomHexId(): string {
  let s = '';
  for (let i = 0; i < 24; i++) s += Math.floor(rand() * 16).toString(16);
  return s;
}
function toUserRef(u: (typeof MOCK_USERS)[number]): UserRef {
  return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl };
}

// ── Fixed catalogs ──────────────────────────────────────────────────────────
// Ids/keys/names for the 11 already-selectable types match
// `lib/constants/incident-types.ts` exactly; the other 4 exist only in this
// dataset until F2.3 adds them to the selector.
const TYPES: IncidentType[] = [
  { id: 'e05995817a9a9bf5c0298f7d', key: 'plumbing', name: 'Hidrosanitario', name_en: 'Plumbing' },
  {
    id: '9a92d827f32fdf3729e233e7',
    key: 'coordination',
    name: 'Coordinación de Diseños',
    name_en: 'Coordination',
  },
  { id: '074cf498175293d292634177', key: 'electrical', name: 'Electrico', name_en: 'Electrical' },
  {
    id: '17e0a4611debf0541f304dc1',
    key: 'infrastructure',
    name: 'Infraestructura',
    name_en: 'Infrastructure',
  },
  {
    id: 'd123615675901ace745a9ebc',
    key: 'safety_hazard',
    name: 'Prevención de riesgos',
    name_en: 'Safety hazard',
  },
  { id: '6b2e93038669ec55c98bdd30', key: 'structural', name: 'Estructural', name_en: 'Structural' },
  { id: 'd9da51900eb9cd4d3e425a32', key: 'materials', name: 'Materiales', name_en: 'Materials' },
  { id: 'c13c63a4217f35835ef33cc2', key: 'masonry', name: 'Mamposteria', name_en: 'Masonry' },
  { id: 'arch_001', key: 'architectural', name: 'Arquitectónico', name_en: 'Architectural' },
  { id: 'stab_001', key: 'stability', name: 'Estabilidad', name_en: 'Stability' },
  {
    id: 'obs_001',
    key: 'observation',
    name: 'Observación General',
    name_en: 'General Observation',
  },
  { id: 'exc_001', key: 'excavation', name: 'Excavación', name_en: 'Excavation' },
  { id: 'fnd_001', key: 'foundation', name: 'Cimentación', name_en: 'Foundation' },
  { id: 'soil_001', key: 'soil-study', name: 'Estudio de Suelos', name_en: 'Soil Study' },
  {
    id: 'urb_001',
    key: 'urban_planning',
    name: 'Planeación Urbana',
    name_en: 'Urban Planning',
  },
];

// Ids/names match `lib/constants/projects.ts`, the catalog IssueForm.tsx offers.
const PROJECTS: Project[] = [
  { id: '51ae14076884e5134d3afcde', name: 'Edificio Cedro Real - Etapa 1' },
  { id: 'e845fadb72b05dfd164a0f52', name: 'Conjunto Residencial Los Almendros' },
];

// Same catalog IssueForm.tsx offers when creating a new incident.
const TAGS: Tag[] = [
  { id: '4bf3f690ae021229ec15f203', name: 'Reproceso', color: '#EF4444' },
  { id: '2a544044d7c705a56d0cf6c5', name: 'Acabados', color: '#6366F1' },
  { id: '86207f931475a6ec04908f00', name: 'Urgente', color: '#F59E0B' },
  { id: '95ef91272c28455168120ac3', name: 'Humedad', color: '#3B82F6' },
  { id: '132cd775ccc64acfd82582cc', name: 'Cliente', color: '#EC4899' },
  { id: 'a0314e3a97dac785a2dd5a6f', name: 'Seguridad', color: '#10B981' },
  { id: '835ac9eaf409e5d275108498', name: 'Calidad', color: '#8B5CF6' },
  { id: 'd1fa90ad0559f69ec34319e1', name: 'Garantía', color: '#14B8A6' },
];

// A few title/description templates per type; {level}/{axis} are filled per incident.
const TEMPLATES: Record<string, { title: string; description: string }[]> = {
  plumbing: [
    {
      title: 'Fuga en tubería de suministro',
      description: 'Se detecta fuga de agua potable en tubería de suministro del nivel {level}.',
    },
    {
      title: 'Obstrucción en bajante sanitario',
      description: 'Bajante de aguas residuales presenta obstrucción recurrente en el eje {axis}.',
    },
    {
      title: 'Filtración en cuarto de bombas',
      description: 'Filtración de agua visible en el cuarto de bombas del nivel {level}.',
    },
  ],
  coordination: [
    {
      title: 'Choque entre ductos y viga estructural',
      description:
        'El modelo BIM muestra interferencia entre ductos de ventilación y una viga estructural en el eje {axis}.',
    },
    {
      title: 'Falta de coordinación entre diseño eléctrico y estructural',
      description: 'Los planos eléctricos no reflejan los cambios estructurales del nivel {level}.',
    },
    {
      title: 'Interferencia entre redes hidráulicas y eléctricas',
      description:
        'Se detecta cruce de redes hidráulicas y eléctricas sin resolver en el eje {axis}.',
    },
  ],
  electrical: [
    {
      title: 'Tablero eléctrico sin certificar',
      description:
        'El tablero de distribución del nivel {level} no cuenta con certificación vigente.',
    },
    {
      title: 'Cableado expuesto en zona común',
      description: 'Se observa cableado eléctrico expuesto en la zona común del eje {axis}.',
    },
    {
      title: 'Falla intermitente en iluminación de emergencia',
      description: 'La iluminación de emergencia del nivel {level} presenta fallas intermitentes.',
    },
  ],
  infrastructure: [
    {
      title: 'Hundimiento en vía de acceso',
      description: 'Se evidencia hundimiento en la vía de acceso vehicular cercana al eje {axis}.',
    },
    {
      title: 'Daño en red de alcantarillado perimetral',
      description:
        'La red de alcantarillado perimetral presenta daños en el sector del nivel {level}.',
    },
    {
      title: 'Deterioro en cerramiento perimetral',
      description: 'El cerramiento perimetral de la obra presenta deterioro en el eje {axis}.',
    },
  ],
  safety_hazard: [
    {
      title: 'Falta de baranda en borde de placa',
      description: 'El borde de placa del nivel {level} no cuenta con baranda de protección.',
    },
    {
      title: 'Andamio sin anclaje adecuado',
      description: 'Se identifica andamio sin anclaje adecuado en el eje {axis}.',
    },
    {
      title: 'Ausencia de señalización en zona de riesgo',
      description: 'No hay señalización visible en la zona de riesgo del nivel {level}.',
    },
  ],
  structural: [
    {
      title: 'Fisura en columna',
      description: 'Fisura longitudinal visible en columna del eje {axis}, nivel {level}.',
    },
    {
      title: 'Asentamiento diferencial en placa',
      description:
        'Se observa asentamiento diferencial en la placa de entrepiso del nivel {level}.',
    },
    {
      title: 'Deflexión excesiva en viga',
      description: 'La viga del eje {axis} presenta deflexión superior a la tolerancia de diseño.',
    },
  ],
  materials: [
    {
      title: 'Material de recubrimiento no conforme',
      description:
        'El material de recubrimiento entregado no cumple la especificación técnica del nivel {level}.',
    },
    {
      title: 'Almacenamiento inadecuado de cemento',
      description:
        'Se detecta almacenamiento inadecuado de cemento en el eje {axis}, con riesgo de pérdida por humedad.',
    },
    {
      title: 'Acero de refuerzo con diámetro incorrecto',
      description:
        'El acero de refuerzo entregado para el nivel {level} no corresponde al diámetro especificado.',
    },
  ],
  masonry: [
    {
      title: 'Desplome en muro de mampostería',
      description: 'Se evidencia desplome leve en muro de mampostería del eje {axis}.',
    },
    {
      title: 'Fisuras en pañete',
      description: 'Aparecen fisuras en el pañete del muro divisorio del nivel {level}.',
    },
    {
      title: 'Junta de dilatación mal ejecutada',
      description:
        'La junta de dilatación en el muro del eje {axis} no cumple el detalle constructivo.',
    },
  ],
  architectural: [
    {
      title: 'Cambio no autorizado en diseño de fachada',
      description: 'Se ejecuta un cambio no autorizado en el diseño de fachada del nivel {level}.',
    },
    {
      title: 'Incumplimiento de altura libre en cielo raso',
      description: 'El cielo raso instalado en el eje {axis} no respeta la altura libre de diseño.',
    },
    {
      title: 'Acabado de piso distinto al especificado',
      description:
        'El acabado de piso instalado en el nivel {level} difiere del especificado en planos.',
    },
  ],
  stability: [
    {
      title: 'Riesgo de volcamiento en talud provisional',
      description: 'El talud provisional cercano al eje {axis} presenta riesgo de volcamiento.',
    },
    {
      title: 'Deformación en muro de contención',
      description: 'Se observa deformación en el muro de contención del nivel {level}.',
    },
    {
      title: 'Inestabilidad en excavación a cielo abierto',
      description: 'La excavación a cielo abierto del eje {axis} muestra signos de inestabilidad.',
    },
  ],
  observation: [
    {
      title: 'Observación general de avance de obra',
      description: 'Registro general del avance de obra en el nivel {level}.',
    },
    {
      title: 'Recomendación de mantenimiento preventivo',
      description: 'Se recomienda mantenimiento preventivo en la zona del eje {axis}.',
    },
    {
      title: 'Nota de seguimiento sin acción requerida',
      description:
        'Observación de seguimiento en el nivel {level}, sin acción inmediata requerida.',
    },
  ],
  excavation: [
    {
      title: 'Nivel freático más alto de lo previsto',
      description: 'La excavación del eje {axis} encuentra nivel freático más alto de lo previsto.',
    },
    {
      title: 'Desprendimiento de material en corte de talud',
      description:
        'Se presenta desprendimiento de material en el corte de talud del nivel {level}.',
    },
    {
      title: 'Retraso en excavación por roca no prevista',
      description:
        'La excavación del eje {axis} se retrasa por presencia de roca no prevista en el estudio.',
    },
  ],
  foundation: [
    {
      title: 'Asentamiento no previsto en zapata',
      description: 'Se detecta asentamiento no previsto en la zapata del eje {axis}.',
    },
    {
      title: 'Fisura en dado de cimentación',
      description: 'Aparece fisura en el dado de cimentación del nivel {level}.',
    },
    {
      title: 'Diferencia entre cota de cimentación y diseño',
      description:
        'La cota de cimentación ejecutada en el eje {axis} difiere de la especificada en planos.',
    },
  ],
  'soil-study': [
    {
      title: 'Capacidad portante inferior a la estimada',
      description:
        'El ensayo de suelos del eje {axis} arroja capacidad portante inferior a la estimada.',
    },
    {
      title: 'Presencia de material orgánico no reportado',
      description:
        'Se encuentra material orgánico no reportado en el estudio de suelos del nivel {level}.',
    },
    {
      title: 'Necesidad de sondeo adicional',
      description:
        'Se requiere un sondeo adicional en el eje {axis} para confirmar el perfil estratigráfico.',
    },
  ],
  urban_planning: [
    {
      title: 'Incumplimiento de retiro urbanístico',
      description: 'El diseño actual no cumple con el retiro urbanístico exigido en el eje {axis}.',
    },
    {
      title: 'Ajuste requerido por norma de uso de suelo',
      description:
        'Se requiere ajuste por cambio en la norma de uso de suelo del sector del nivel {level}.',
    },
    {
      title: 'Observación de curaduría sobre índice de ocupación',
      description:
        'La curaduría urbana señala una observación sobre el índice de ocupación del proyecto.',
    },
  ],
};

const AXIS_LETTERS = ['A', 'B', 'C', 'D', 'E'];
function randomAxis(): string {
  return `${pick(AXIS_LETTERS)}${randomInt(1, 9)}`;
}
function fillTemplate(text: string, level: number, axis: string): string {
  return text.replace('{level}', String(level)).replace('{axis}', axis);
}

// Bogotá-ish spread, matching the app's existing map demo center.
function randomCoordinates(): Coordinates {
  return {
    lat: Number((4.6 + rand() * 0.15).toFixed(6)),
    lng: Number((-74.15 + rand() * 0.13).toFixed(6)),
  };
}

function randomMedia(seed: string): Media[] {
  const count = randomInt(0, 3);
  return Array.from({ length: count }, (_, i) => {
    const isVideo = rand() < 0.2;
    return {
      id: `media_${seed}_${i + 1}`,
      name: `evidencia_${seed}_${i + 1}.${isVideo ? 'mp4' : 'png'}`,
      type: isVideo ? 'video' : 'image',
      format: isVideo ? 'mp4' : 'png',
      size: randomInt(150_000, 2_000_000),
      status: 'uploaded',
      url: `https://picsum.photos/seed/inc${seed}_${i + 1}/1280/720`,
    };
  });
}

function buildIncident(index: number): Incident {
  const sequenceId = String(index + 1).padStart(4, '0');
  const type = pick(TYPES);
  const template = pick(TEMPLATES[type.key]);
  const level = randomInt(1, 20);
  const axis = randomAxis();

  const priority = weightedPick<IncidentPriority>([
    ['high', 0.32],
    ['medium', 0.49],
    ['low', 0.19],
  ]);
  const status = weightedPick<IncidentStatus>([
    ['open', 0.5],
    ['closed', 0.33],
    ['on_pause', 0.17],
  ]);
  const approval = rand() < 0.3;

  const now = Date.now();
  const createdAt = new Date(now - randomInt(1, 200) * 86_400_000);
  const dueDate =
    rand() < 0.6 ? new Date(createdAt.getTime() + randomInt(5, 45) * 86_400_000) : null;
  // Closing is itself the incident's last update, so it can't predate updatedAt.
  const closingDate =
    status === 'closed' ? new Date(createdAt.getTime() + randomInt(2, 60) * 86_400_000) : null;
  const updatedAt = closingDate ?? new Date(createdAt.getTime() + randomInt(0, 20) * 86_400_000);

  const owner = toUserRef(pick(MOCK_USERS));
  const assignees = pickSome(MOCK_USERS, 1, 2).map(toUserRef);
  const observers = pickSome(MOCK_USERS, 0, 2).map(toUserRef);
  const tags = pickSome(TAGS, 0, 3);

  return {
    id: randomHexId(),
    sequenceId,
    order: index + 1,
    title: template.title,
    description: fillTemplate(template.description, level, axis),
    type,
    priority,
    status,
    approval,
    project: pick(PROJECTS),
    owner,
    assignees,
    observers,
    coordinates: randomCoordinates(),
    locationDescription: `Nivel ${level} - eje ${axis}`,
    dueDate: dueDate ? dueDate.toISOString() : null,
    closingDate: closingDate ? closingDate.toISOString() : null,
    media: randomMedia(`${index + 1}`),
    tags,
    deleted: rand() < 0.12 ? true : null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

const incidents = Array.from({ length: INCIDENT_COUNT }, (_, i) => buildIncident(i));
writeFileSync(OUTPUT_PATH, JSON.stringify(incidents, null, 2) + '\n', 'utf-8');
console.log(`Generated ${incidents.length} incidents -> ${OUTPUT_PATH}`);
