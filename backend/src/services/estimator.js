import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const _plans = JSON.parse(readFileSync(join(dataDir, 'plans.json'), 'utf-8'));
const _hospitals = JSON.parse(readFileSync(join(dataDir, 'hospitals.json'), 'utf-8'));
const _specialties = JSON.parse(readFileSync(join(dataDir, 'specialties.json'), 'utf-8'));

export const ESPECIALIDADES_VALIDAS = new Set(_specialties.map(s => s.id));

export function loadPlans() {
  return _plans;
}

export function loadHospitals() {
  return _hospitals;
}

const DISCLAIMER =
  'Esta es una estimación informativa basada en aranceles referenciales y la configuración mock de tu plan. ' +
  'No constituye autorización formal del seguro ni reemplaza una consulta médica. ' +
  'Confirma con tu aseguradora antes de la atención.';

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function estimate({ specialty, planId }) {
  const plan = _plans.find(p => p.id === planId);
  if (!plan) throw new Error(`plan no encontrado: ${planId}`);
  if (!ESPECIALIDADES_VALIDAS.has(specialty)) {
    throw new Error(`especialidad inválida: ${specialty}`);
  }

  const tipoConsulta = specialty === 'medicina_general' ? 'consulta_general' : 'consulta_especialista';
  const coberturaBase = plan.cobertura[tipoConsulta] ?? 0;

  const opciones = _hospitals
    .filter(h => h.especialidades.includes(specialty))
    .map(h => {
      const precioBase = h.precios[tipoConsulta];
      const enRed = plan.hospitales_red.includes(h.id);
      const coberturaAplicada = enRed ? coberturaBase : Math.max(0, coberturaBase - 30);
      const montoCubierto = (precioBase * coberturaAplicada) / 100;
      const copagoCalculado = precioBase - montoCubierto;
      const copagoFinal = Math.max(copagoCalculado, plan.copago_minimo);

      return {
        hospital_id: h.id,
        nombre: h.nombre,
        ciudad: h.ciudad,
        tier: h.tier,
        rating: h.rating,
        en_red: enRed,
        desglose: {
          precio_base: precioBase,
          cobertura_pct: coberturaAplicada,
          monto_cubierto: round2(montoCubierto),
          copago: round2(copagoFinal)
        }
      };
    })
    .sort((a, b) => a.desglose.copago - b.desglose.copago);

  return {
    especialidad: specialty,
    plan: { id: plan.id, nombre: plan.nombre, tier: plan.tier },
    hospitales: opciones,
    disclaimer: DISCLAIMER
  };
}
