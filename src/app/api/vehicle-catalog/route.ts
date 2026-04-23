import { NextResponse } from "next/server";
import { createRequire } from "module";

/** Entrée CommonJS du package (évite le sous-chemin ESM incompatible avec le bundle Next). */
const requireCjs = createRequire(import.meta.url);
const { getBrands, getModelsByBrand, getGenerations } = requireCjs("auto-parts-db") as typeof import("auto-parts-db");

/**
 * Catalogue marques / modèles (serveur uniquement — évite d’embarquer ~3 Mo de données côté client).
 * GET /api/vehicle-catalog → { brands: string[] }
 * GET /api/vehicle-catalog?brand=Toyota → { models: string[] }
 * GET /api/vehicle-catalog?brand=Toyota&model=Yaris → { years: number[] }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const brand = searchParams.get("brand")?.trim();
    const model = searchParams.get("model")?.trim();
    if (!brand) {
      const brands = getBrands().slice().sort((a, b) => a.localeCompare(b, "fr"));
      return NextResponse.json({ brands });
    }
    if (model) {
      const generations = getGenerations(brand, model);
      const years: number[] = [];
      for (const g of generations ?? []) {
        const from = Number(g?.yearFrom);
        const to = Number(g?.yearTo);
        if (!Number.isFinite(from) || !Number.isFinite(to)) continue;
        for (let y = from; y <= to; y += 1) years.push(y);
      }
      const uniqueSorted = Array.from(new Set(years)).sort((a, b) => b - a);
      return NextResponse.json({ years: uniqueSorted });
    }
    const raw = getModelsByBrand(brand);
    const models = Array.from(
      new Set(raw.map((m) => m.name.trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "fr"));
    return NextResponse.json({ models });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur catalogue" },
      { status: 500 }
    );
  }
}
