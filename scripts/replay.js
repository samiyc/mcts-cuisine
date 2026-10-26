import { readFileSync } from "node:fs";
import { gapsOf, playReplay } from "../src/replay.js";

/**
 * `npm run replay -- service.json [--trace] [--gaps]`: plays a service saved at the keyboard again (the page's
 * « Télécharger ») and says what looked wrong, with the turn it was first seen; `--trace` prints every cook at every
 * turn the chef pressed a key. `--gaps`: at each order the chef took, every order he could have taken, tried with
 * hindsight (src/replay.js, gapsOf), and what his choice cost in dishes.
 */
const [file, ...flags] = process.argv.slice(2);
if (!file) {
  console.error("usage : npm run replay -- service.json [--trace] [--gaps]");
  process.exit(1);
}
const replay = JSON.parse(readFileSync(file, "utf8"));
const trace = flags.includes("--trace");
/** A cook's order and step, as `/12:cut`, or nothing when its hands are empty. */
const doing = (cook) => (cook.order ? `/${cook.order}:${cook.steps?.[cook.step]?.type ?? ""}` : "");
const where = (state) => state.cooks.map((cook) => `${cook.kind === "human" ? "H" : cook.id}:${cook.phase}${doing(cook)}@${cook.x},${cook.y}`).join(" ");
const { state, anomalies } = playReplay(replay, {
  onTurn: (now, said) => {
    if (trace && said !== null) console.log(`tour ${now.t} : « ${said} » ${where(now)}`);
  },
});
const served = state.upcoming.filter((order) => order.status === "served");
console.log(`${replay.kitchenId}, service ${replay.seed}, robots : ${replay.rule}, ${replay.inputs.length} touches ; ${served.length} servies, ${served.filter((order) => order.servedAt <= order.deadline).length} à temps.`);
if (anomalies.length === 0) console.log("Rien d'anormal.");
for (const { t, text } of anomalies) console.log(`tour ${t} : ${text}`);

if (flags.includes("--gaps")) {
  const { decisions, agreed, gap } = gapsOf(replay);
  const fixed = (value) => value.toFixed(1).replace(".", ",");
  console.log(`\nLes choix du chef, rejoués avec le recul (60 tours après chacun, puis le chef « le plus urgent », les robots « le plat le plus rapide ») :`);
  console.log(`${decisions.length} choix, ${agreed} aussi bons que le meilleur ; ${fixed(gap)} plat(s) à temps perdu(s) en tout.`);
  for (const { t, chosen, best, gap: lost, options } of decisions) {
    const name = (id) => {
      const option = options.find((one) => one.id === id);
      return `commande ${id} (${option.recipe}${option.status === "ready" ? ", prête sur le feu" : ""})`;
    };
    const verdict = lost > 0 ? ` ; mieux : ${name(best)}, +${fixed(lost)} plat` : " : le meilleur choix";
    const values = options.map((option) => `${option.id} → ${fixed(option.value)}`).join(", ");
    console.log(`tour ${t} : ${name(chosen)}${verdict}  [${values}]`);
  }
}
