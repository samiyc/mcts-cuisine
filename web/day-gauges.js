import { MENU } from "../src/day-menu.js";

/**
 * The gauges of the tab « Journée » (Sami, 1/11/2026, docs/journee.md): which ones, by card, and each one's full bar.
 */
/**
 * The gauges by card: each `[its gauge, its words]`.
 * @type {readonly [string, string[][]][]}
 */
export const CARDS = [
  ["Les réserves", [["camion", "Le camion"], ["F", "Chambre froide"], ["T", "Stock tempéré"], ["G", "Conserves, céréales"], ["plats", "Plats aux frigos"], ["desserts", "Desserts aux frigos"]]],
  ["Les postes pris", [["pris:P", "Fourneaux"], ["pris:A", "Fours"], ["pris:C", "Planches"], ["pris:_", "Dressage"], ["pris:Z", "Cellule"], ["pris:L", "Plonge"]]],
  ["Le service", [["bons", "Bons en cours"], ["envoyes", "Assiettes envoyées"], ["clients", "Clients en salle"], ["partis", "Clients partis"], ["propres", "Assiettes propres"], ["assiettes", "Assiettes sales"], ["sale", "Batterie sale"]]],
  ["La salle et le bar", [["resa:attendues", "Réservations à venir"], ["resa:absents", "Réservations absentes"], ["tables:pretes", "Tables dressées"], ["tables:sales", "Tables à nettoyer"], ["bar:debout", "Debout au bar"], ["verres", "Verres à préparer"], ["boissons", "Boissons au bar"]]],
  ["Les déchets (kg)", [["dechet:bio", "Bac biodéchets"], ["dechet:emballages", "Bac cartons"], ["dechet:verre", "Bac verre"], ["dechet:ordures", "Bac ordures"], ["local", "Au local"]]],
];
/** The summed gauges' full bars: what the batches of this day make. */
const fullOf = ({ batches }, fridge) => MENU.filter((dish) => dish.fridge === fridge).reduce((sum, dish) => sum + batches[dish.id] * dish.portions, 0);

/** Each gauge's full bar, for this day: the number of a kind of station, or the highest its value goes. */
export function topsOf({ gauges, layout, forecast }) {
  const tops = { plats: fullOf(forecast, "f"), desserts: fullOf(forecast, "d") };
  for (const [name, series] of Object.entries(gauges)) tops[name] = name.startsWith("pris:") ? layout.stations[name.slice(5)].length : Math.max(1, ...series.map((entry) => entry[1]));
  return tops;
}
