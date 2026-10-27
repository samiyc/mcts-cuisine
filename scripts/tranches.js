import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * `npm run tranches -- night.json`: the night file cut in jobs of 30 minutes at most (Sami, 27/10/2026, mcts-commun's
 * recommendations to the projects), written beside it as `night.tranches.json`, for `mcts-backlog --add-file`.
 *
 * A measure whose estimate passes `SLICE` minutes is played in slices (`--de`, `--services`), each one an id of its
 * own (`<id>-t1`, `<id>-t2`…); the measure's own id comes after them (`after`) and gathers them: the same command,
 * its services all found in the slices' lines (`--lignes`, scripts/compare-lines.js), so it only prints the table
 * (its output, `~/.mcts-backlog/runs/*_<id>-<tag>.txt`, is where the docs read it). A measure under `SLICE` stays one
 * job, its lines written too. Each limit is `SPAN` times its estimate, 30 minutes at least: past the worst case.
 *
 * `--arret-anticipe` (mcts-commun's earlyStop, 27/10/2026, the search's default since): every measure of the search
 * plays the search with and without the early stop on the same services (`npm run compare -- --arret-anticipe`), under an id of its own (`<id>-arret`),
 * its estimate twice the search's, written to `<file>.arret.tranches.json`; the measures without the search are left out.
 */
const SLICE = 25;
const SPAN = 3;

/** Minutes from the queue's words: "1 h 30", "40 min", "2 h". */
export function minutesOf(text) {
  const words = text.trim().split(" ");
  const unitOf = (i) => (words[i + 1] === "h" ? 60 : 1);
  return words.reduce((sum, word, i) => (Number.isNaN(Number(word)) ? sum : sum + Number(word) * unitOf(i)), 0);
}

/** The queue's words for `minutes`. */
export function wordsOf(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)} h ${String(rest).padStart(2, "0")}` : `${minutes / 60} h`;
}

const limitOf = (minutes) => Math.max(30, Math.ceil(SPAN * minutes));

/** `job` with the early stop beside its search (`--arret-anticipe`), or null when it has no search to stop. */
export function withEarlyStop(job) {
  if (!/--search\b/.test(job.command)) return null;
  return { ...job, id: `${job.id}-arret`, command: `${job.command} --arret-anticipe`, estimate: wordsOf(2 * minutesOf(job.estimate)) };
}

/** `job` (a compare command with `--services N`) as its slices and the job that gathers them, or alone. */
export function slicesOf(job) {
  const services = Number(/--services (\d+)/.exec(job.command)?.[1]);
  const minutes = minutesOf(job.estimate);
  const count = Math.min(services, Math.ceil(minutes / SLICE));
  if (!services || count <= 1) return [{ ...job, command: `${job.command} --lignes`, limit: limitOf(minutes) }];
  const size = Math.ceil(services / count);
  const each = Math.ceil(minutes / count);
  const slices = [];
  for (let first = 1, n = 1; first <= services; first += size, n += 1) {
    const command = job.command.replace(/--services \d+/, `--services ${Math.min(size, services - first + 1)} --de ${first}`);
    slices.push({ ...job, id: `${job.id}-t${n}`, command: `${command} --lignes`, estimate: wordsOf(each), limit: limitOf(each) });
  }
  const gather = { ...job, command: `${job.command} --lignes`, estimate: "5 min", limit: limitOf(each), after: [...(job.after ?? []), ...slices.map((one) => one.id)] };
  return [...slices, gather];
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const early = process.argv.includes("--arret-anticipe");
  const file = process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? "night.json";
  const source = JSON.parse(readFileSync(file, "utf8"));
  const measures = early ? source.jobs.map(withEarlyStop).filter(Boolean) : source.jobs;
  const jobs = measures.flatMap(slicesOf);
  const out = file.replace(/\.json$/, early ? ".arret.tranches.json" : ".tranches.json");
  const about = `${source.about} Coupé en tranches de ${SLICE} min au plus par npm run tranches -- ${file}${early ? " --arret-anticipe" : ""} (scripts/tranches.js) : ${measures.length} mesures, ${jobs.length} jobs.`;
  writeFileSync(out, `${JSON.stringify({ about, jobs }, null, 2)}\n`);
  console.log(`${out} : ${measures.length} mesures, ${jobs.length} jobs`);
}
