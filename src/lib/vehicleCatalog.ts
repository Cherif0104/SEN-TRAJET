import type { RideClass } from "@/lib/types";

export const VEHICLE_CATALOG: Record<string, string[]> = {
  Audi: ["A3", "A4", "A6", "Q3", "Q5", "Q7"],
  BMW: ["Série 1", "Série 3", "Série 5", "X1", "X3", "X5"],
  BYD: ["Dolphin", "Atto 3", "Seal", "Song Plus"],
  Changan: ["Alsvin", "CS35 Plus", "CS55 Plus", "CS75 Plus"],
  Chery: ["Arrizo 5", "Tiggo 2", "Tiggo 4", "Tiggo 7", "Tiggo 8"],
  Chevrolet: ["Aveo", "Cruze", "Malibu", "Captiva", "Tahoe"],
  Citroën: ["C3", "C4", "C5 Aircross", "Berlingo", "Jumpy"],
  Dacia: ["Logan", "Sandero", "Duster", "Lodgy"],
  Fiat: ["500", "Tipo", "Panda", "Doblo"],
  Ford: ["Fiesta", "Focus", "Fusion", "Escape", "Explorer", "Transit"],
  Geely: ["Emgrand", "Coolray", "Atlas", "Okavango"],
  Honda: ["City", "Civic", "Accord", "CR-V", "HR-V"],
  Hyundai: ["i10", "i20", "Accent", "Elantra", "Sonata", "Tucson", "Santa Fe", "H-1", "Staria"],
  Isuzu: ["D-Max", "MU-X"],
  Jaguar: ["XE", "XF", "F-Pace"],
  Jeep: ["Renegade", "Compass", "Cherokee", "Grand Cherokee"],
  Kia: ["Picanto", "Rio", "Cerato", "K5", "Sportage", "Sorento", "Carnival"],
  Land_Rover: ["Discovery Sport", "Discovery", "Range Rover Evoque", "Range Rover Sport", "Range Rover"],
  Lexus: ["IS", "ES", "LS", "NX", "RX", "LX"],
  Mazda: ["Mazda 2", "Mazda 3", "Mazda 6", "CX-3", "CX-5", "CX-9"],
  Mercedes_Benz: ["Classe A", "Classe C", "Classe E", "Classe S", "GLA", "GLC", "GLE", "Vito", "Classe V"],
  MG: ["MG3", "MG5", "ZS", "HS", "Marvel R"],
  Mitsubishi: ["Lancer", "ASX", "Outlander", "Pajero", "Xpander"],
  Nissan: ["Micra", "Sunny", "Sentra", "Altima", "Qashqai", "X-Trail", "Pathfinder", "Patrol", "Urvan"],
  Opel: ["Corsa", "Astra", "Insignia", "Mokka", "Zafira"],
  Peugeot: ["208", "301", "308", "408", "508", "2008", "3008", "5008", "Expert"],
  Porsche: ["Macan", "Cayenne", "Panamera", "Taycan"],
  Renault: ["Clio", "Symbol", "Mégane", "Talisman", "Captur", "Kadjar", "Koleos", "Trafic"],
  Skoda: ["Fabia", "Scala", "Octavia", "Superb", "Karoq", "Kodiaq"],
  Suzuki: ["Alto", "Swift", "Ciaz", "Baleno", "Vitara", "Ertiga"],
  Tesla: ["Model 3", "Model Y", "Model S", "Model X"],
  Toyota: ["Yaris", "Corolla", "Camry", "Avensis", "C-HR", "RAV4", "Fortuner", "Land Cruiser", "Prado", "Hiace"],
  Volkswagen: ["Polo", "Golf", "Jetta", "Passat", "T-Roc", "Tiguan", "Touareg", "Caddy", "Transporter"],
  Volvo: ["S60", "S90", "XC40", "XC60", "XC90"]
};

export const VEHICLE_BRANDS = Object.keys(VEHICLE_CATALOG)
  .map((brand) => brand.replaceAll("_", " "))
  .sort((a, b) => a.localeCompare(b, "fr"));

export const VEHICLE_COLORS = [
  { value: "Noir", hex: "#17191d" },
  { value: "Blanc", hex: "#f5f5f2" },
  { value: "Gris", hex: "#858b91" },
  { value: "Argent", hex: "#c8ccd0" },
  { value: "Bleu", hex: "#2459a9" },
  { value: "Rouge", hex: "#ba2935" },
  { value: "Vert", hex: "#2f6f50" },
  { value: "Beige", hex: "#c7b38d" },
  { value: "Marron", hex: "#76513d" },
  { value: "Jaune", hex: "#e9bd35" }
] as const;

export const VEHICLE_YEARS = Array.from(
  { length: new Date().getFullYear() - 1994 },
  (_, index) => new Date().getFullYear() + 1 - index
);

export function modelsForBrand(brand: string) {
  return VEHICLE_CATALOG[brand.replaceAll(" ", "_")] ?? [];
}

export function eligibleRideClasses(year: number): RideClass[] {
  const classes: RideClass[] = ["eco"];
  if (year >= 2015) classes.push("comfort");
  if (year >= 2019) classes.push("comfort_plus");
  if (year >= 2022) classes.push("vip");
  return classes;
}

export function rideClassLabel(value: RideClass) {
  return value === "comfort_plus" ? "Confort+" : value === "vip" ? "Premium" : value === "comfort" ? "Confort" : "Éco";
}
