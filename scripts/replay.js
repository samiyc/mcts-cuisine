import { readFileSync } from "node:fs";
import { playReplay } from "../src/replay.js";

/**
 * `npm run replay -- service.json [--trace]`: plays a service saved at the keyboard again (the page's « Télécharger
 * le replay ») and says what looked wrong, with the turn it was first seen; `--trace` prints every cook at every
 * turn the chef pressed a key or something looked wrong.
 */
const [file, ...flags] = process.argv.slice(2);
if (!file) {
  console.error("usage : npm run replay -- service.json [--trace]");
  process.exit(1);
}
const replay = JSON.parse(readFileSync(file, "utf8"));
const trace = flags.includes("--trace");
const where = (state) => state.cooks.map((cook) => `${cook.kind === "human" ? "H" : cook.id}:${cook.phase}${cook.order ? `/${cook.order}:${cook.steps?.[cook.step]?.type ?? ""}` : ""}@${cook.x},${cook.y}`).join(" ");
const { state, anomalies } = playReplay(replay, {
  onTurn: (now, said) => {
    if (trace && said !== null) console.log(`tour ${now.t} : « ${said} » ${where(now)}`);
  },
});
const served = state.upcoming.filter((order) => order.status === "served");
console.log(`${replay.kitchenId}, service ${replay.seed}, robots : ${replay.rule}, ${replay.inputs.length} touches ; ${served.length} servies, ${served.filter((order) => order.servedAt <= order.deadline).length} à temps.`);
if (anomalies.length === 0) console.log("Rien d'anormal.");
for (const { t, text } of anomalies) console.log(`tour ${t} : ${text}`);
