/**
 * Build senegalLocations from BDD_Liste_Maires_SENEGAL.xlsx
 * Output: Region → Department (region_dep) → Communes[]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const xlsxPath = path.join(root, 'BDD_Liste_Maires_SENEGAL.xlsx');

// region_dep (from Excel) → official region name (for grouping)
const REGION_DEP_TO_REGION = {
  DAKAR: 'Dakar',
  GUEDIAWAYE: 'Dakar',
  PIKINE: 'Dakar',
  RUFISQUE: 'Dakar',
  DIOURBEL: 'Diourbel',
  '78182': 'Diourbel', // Bambey
  MBACKE: 'Diourbel',
  FATICK: 'Fatick',
  FOUNDIOUGNE: 'Fatick',
  GOSSAS: 'Fatick',
  KAFFRINE: 'Kaffrine',
  BIRKELANE: 'Kaffrine',
  'MALEME - HODAR': 'Kaffrine',
  KOUNGHEUL: 'Kaffrine',
  KAOLACK: 'Kaolack',
  AAA: 'Kaolack', // Guinguinéo/Mbadakhoune
  'NIORO DU RIP': 'Kaolack',
  KEDOUGOU: 'Kédougou',
  SALEMATA: 'Kédougou',
  SARAYA: 'Kédougou',
  KOLDA: 'Kolda',
  'MEDINA YORO FOULAH': 'Kolda',
  VELINGARA: 'Kolda',
  LOUGA: 'Louga',
  KEBEMER: 'Louga',
  BBB: 'Louga', // Linguère
  MATAM: 'Matam',
  KANEL: 'Matam',
  RANEROU: 'Matam',
  'SAINT-LOUIS': 'Saint-Louis',
  DAGANA: 'Saint-Louis',
  PODOR: 'Saint-Louis',
  SEDHIOU: 'Sédhiou',
  BOUNKILING: 'Sédhiou',
  GOUDOMP: 'Sédhiou',
  TAMBACOUNDA: 'Tambacounda',
  GOUDIRY: 'Tambacounda',
  BAKEL: 'Tambacounda',
  KOUMPENTOUM: 'Tambacounda',
  THIES: 'Thiès',
  MBOUR: 'Thiès',
  TIVAOUANE: 'Thiès',
  ZIGUINCHOR: 'Ziguinchor',
  BIGNONA: 'Ziguinchor',
  OU: 'Ziguinchor', // Oussouye
  CCC: 'Ziguinchor', // Oussouye
};

let XLSX;
try {
  ({ default: XLSX } = await import('xlsx'));
} catch {
  console.error(
    "Le package 'xlsx' est requis. Installez-le avec: npm install xlsx"
  );
  process.exit(1);
}

const wb = XLSX.readFile(xlsxPath);
const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
const rows = data.slice(2).filter((r) => r && r[1] != null);

// Build: region → department → Set(commune)
const structure = {};
for (const row of rows) {
  const regionDep = String(row[1] || '').trim();
  const commune = String(row[3] || '').trim();
  if (!regionDep || !commune) continue;
  const region = REGION_DEP_TO_REGION[regionDep] || regionDep;
  if (!structure[region]) structure[region] = {};
  if (!structure[region][regionDep]) structure[region][regionDep] = new Set();
  structure[region][regionDep].add(commune);
}

// Convert Sets to sorted arrays
const out = {};
for (const [region, depts] of Object.entries(structure)) {
  out[region] = {};
  for (const [dept, set] of Object.entries(depts)) {
    out[region][dept] = Array.from(set).sort();
  }
}

// Write as TypeScript module
const tsContent = `/**
 * Liste des régions, départements et communes du Sénégal.
 * Générée depuis BDD_Liste_Maires_SENEGAL.xlsx (script build-senegal-locations.mjs).
 * Structure : région → département → communes[].
 */
export const senegalLocationData: Record<string, Record<string, string[]>> = ${JSON.stringify(out, null, 2)};

export const senegalRegions = Object.keys(senegalLocationData).sort();
`;

const outPath = path.join(root, 'src', 'data', 'senegalLocations.ts');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, tsContent, 'utf8');
console.log('Written', outPath);
console.log('Regions:', Object.keys(out).length);
console.log('Total communes:', Object.values(out).flatMap((d) => Object.values(d).flat()).length);