import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * The results of `npm run compare -- … --lignes` as they come (Sami, 27/10/2026, mcts-commun's recommendations to
 * the projects: a job stopped at its limit or cancelled keeps what it computed). One JSON line a service played, in
 * `resultats/<the code's hash>/`, a file a run; the hash is the kitchen's `src/` and the library's, so a change to
 * either, committed or not, starts afresh. The lines of the same code and the same measure are read back: a service
 * already there is not played again. A job stopped and started again, the slices of a measure and the job that
 * gathers them so share their services.
 */
const ROOT = fileURLToPath(new URL("../resultats/", import.meta.url));
const HERE = fileURLToPath(new URL("..", import.meta.url));

/** Every file under `dir`, its path from `dir` and its text, in order. */
function filesOf(dir, from = dir) {
  return readdirSync(dir, { withFileTypes: true })
    .sort((x, y) => x.name.localeCompare(y.name))
    .flatMap((entry) => (entry.isDirectory() ? filesOf(path.join(dir, entry.name), from) : [[path.relative(from, path.join(dir, entry.name)), readFileSync(path.join(dir, entry.name), "utf8")]]));
}

/** The folder of this code's lines: the hash of the kitchen's sources and the library's. */
function codeFolder() {
  const sources = [path.join(HERE, "src"), path.join(HERE, "node_modules", "mcts-commun", "src")].map((dir) => filesOf(dir));
  return path.join(ROOT, createHash("sha256").update(JSON.stringify(sources)).digest("hex").slice(0, 12));
}

/** What makes a measure: the kitchen with its options, the rules played, the search's budget. */
export const measureKey = (what) => createHash("sha256").update(JSON.stringify(what)).digest("hex").slice(0, 12);

/** The lines already written for `key` in `dir`: `human|seed` → measures by rule. A line cut short is left out. */
function linesOf(dir, key) {
  const found = new Map();
  if (!existsSync(dir)) return found;
  const texts = readdirSync(dir)
    .filter((one) => one.includes(`.${key}.`))
    .flatMap((file) => readFileSync(path.join(dir, file), "utf8").split("\n"));
  for (const line of texts.map(parsed)) if (line?.key === key) found.set(`${line.human}|${line.seed}`, line.measures);
  return found;
}

/** A line read, or null: the last line of a job killed while it wrote, or the empty one after the last. */
function parsed(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * The lines of the measure `key` (`label` names its file): `known(human, seed)`, measures already played;
 * `write(human, seed, measures)`, a line added at once; `file`, where; `written`, how many lines it added.
 */
export function openLines(key, label) {
  const dir = codeFolder();
  const found = linesOf(dir, key);
  const file = path.join(dir, `${label}.${key}.${process.pid}.jsonl`);
  mkdirSync(dir, { recursive: true });
  const lines = {
    file,
    written: 0,
    known: (human, seed) => found.get(`${human}|${seed}`),
    write(human, seed, measures) {
      appendFileSync(file, `${JSON.stringify({ key, human, seed, measures })}\n`);
      lines.written += 1;
    },
  };
  return lines;
}
