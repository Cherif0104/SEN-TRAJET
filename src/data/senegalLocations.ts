export type SenegalDepartmentNode = {
  name: string;
  communes: string[];
};

export type SenegalRegionNode = {
  name: string;
  departments: SenegalDepartmentNode[];
};

export const senegalGeoVersion = "2026-04-v6";

export const senegalAdministrativeTree: SenegalRegionNode[] = [
  { name: "Dakar", departments: [{ name: "Dakar", communes: ["Dakar Plateau", "Medina", "Fann Point-E Amitie", "Gueule Tapee Fass Colobane"] }, { name: "Guediawaye", communes: ["Guediawaye", "Golf Sud", "Sam Notaire", "Wakhinane Nimzatt"] }, { name: "Pikine", communes: ["Pikine Nord", "Pikine Ouest", "Thiaroye", "Keur Massar"] }, { name: "Rufisque", communes: ["Rufisque Est", "Rufisque Ouest", "Sangalkam", "Diamniadio"] }] },
  { name: "Thies", departments: [{ name: "Thies", communes: ["Thies Est", "Thies Ouest", "Thies Nord", "Fandene"] }, { name: "Mbour", communes: ["Mbour", "Saly", "Ngaparou", "Somone", "Joal Fadiouth"] }, { name: "Tivaouane", communes: ["Tivaouane", "Mboro", "Mekhe", "Pire"] }] },
  { name: "Saint-Louis", departments: [{ name: "Saint-Louis", communes: ["Saint-Louis", "Mpal", "Gandon"] }, { name: "Dagana", communes: ["Dagana", "Richard Toll", "Rosso Senegal", "Ndombo Sandjiry"] }, { name: "Podor", communes: ["Podor", "Ndioum", "Aere Lao"] }] },
  { name: "Louga", departments: [{ name: "Louga", communes: ["Louga", "Sakal", "Keur Momar Sarr"] }, { name: "Kebemer", communes: ["Kebemer", "Darou Mouhty", "Ndande"] }, { name: "Linguere", communes: ["Linguere", "Dahra", "Barkedji"] }] },
  { name: "Diourbel", departments: [{ name: "Diourbel", communes: ["Diourbel", "Ndoulo", "Ngohe"] }, { name: "Bambey", communes: ["Bambey", "Baba Garage", "Lambaye"] }, { name: "Mbacke", communes: ["Mbacke", "Touba", "Kael"] }] },
  { name: "Fatick", departments: [{ name: "Fatick", communes: ["Fatick", "Ndiop", "Diakhao"] }, { name: "Foundiougne", communes: ["Foundiougne", "Sokone", "Passy", "Karang Poste"] }, { name: "Gossas", communes: ["Gossas", "Colobane", "Quadiour"] }] },
  { name: "Kaolack", departments: [{ name: "Kaolack", communes: ["Kaolack", "Kahone", "Latmingue", "Ndoffane"] }, { name: "Nioro du Rip", communes: ["Nioro du Rip", "Keur Madiabel", "Wack Ngouna"] }, { name: "Guinguineo", communes: ["Guinguineo", "Fass", "Mboss"] }] },
  { name: "Kaffrine", departments: [{ name: "Kaffrine", communes: ["Kaffrine", "Nganda", "Gniby"] }, { name: "Birkelane", communes: ["Birkelane", "Mabo", "Keur Mboucki"] }, { name: "Koungheul", communes: ["Koungheul", "Missirah Wadene", "Ida Mouride"] }, { name: "Malem Hodar", communes: ["Malem Hodar", "Sagna", "Darou Minam"] }] },
  { name: "Tambacounda", departments: [{ name: "Tambacounda", communes: ["Tambacounda", "Missirah", "Sinthiou Maleme"] }, { name: "Bakel", communes: ["Bakel", "Kidira", "Bala"] }, { name: "Goudiry", communes: ["Goudiry", "Koussanar", "Bala"] }, { name: "Koumpentoum", communes: ["Koumpentoum", "Payar", "Bamba Thialene"] }] },
  { name: "Kedougou", departments: [{ name: "Kedougou", communes: ["Kedougou", "Bandafassi", "Dindefelo"] }, { name: "Salemata", communes: ["Salemata", "Ethiolo", "Oubadji"] }, { name: "Saraya", communes: ["Saraya", "Bembou", "Khossanto"] }] },
  { name: "Kolda", departments: [{ name: "Kolda", communes: ["Kolda", "Dabo", "Bagadadji"] }, { name: "Velingara", communes: ["Velingara", "Diaobe Kabendou", "Pakour"] }, { name: "Medina Yoro Foulah", communes: ["Medina Yoro Foulah", "Niaming", "Pata"] }] },
  { name: "Sedhiou", departments: [{ name: "Sedhiou", communes: ["Sedhiou", "Marsassoum", "Bounkiling"] }, { name: "Bounkiling", communes: ["Bounkiling", "Diacounda", "Madina Wandifa"] }, { name: "Goudomp", communes: ["Goudomp", "Samine", "Tanaff"] }] },
  { name: "Ziguinchor", departments: [{ name: "Ziguinchor", communes: ["Ziguinchor", "Niaguis", "Enampore"] }, { name: "Bignona", communes: ["Bignona", "Thionck Essyl", "Kafountine"] }, { name: "Oussouye", communes: ["Oussouye", "Diembering", "Mlomp"] }] },
  { name: "Matam", departments: [{ name: "Matam", communes: ["Matam", "Ogo", "Nabadji Civol"] }, { name: "Kanel", communes: ["Kanel", "Semme", "Sinthiou Bamambe"] }, { name: "Ranerou Ferlo", communes: ["Ranerou", "Lougre Thiolly", "Velingara Ferlo"] }] },
];

export const senegalRegions = senegalAdministrativeTree.map((region) => region.name);
export const senegalDepartments = senegalAdministrativeTree.flatMap((region) => region.departments.map((department) => department.name));
export const senegalCommunes = senegalAdministrativeTree.flatMap((region) => region.departments.flatMap((department) => department.communes));
export const senegalCities = Array.from(new Set([...senegalDepartments, ...senegalCommunes])).sort((a, b) => a.localeCompare(b, "fr"));

export const departmentsByRegion = Object.fromEntries(
  senegalAdministrativeTree.map((region) => [region.name, region.departments.map((department) => department.name)])
) as Record<string, string[]>;

export const communesByDepartment = Object.fromEntries(
  senegalAdministrativeTree.flatMap((region) => region.departments.map((department) => [department.name, department.communes]))
) as Record<string, string[]>;

export function normalizePlaceName(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}
