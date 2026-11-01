import { MENU } from "../../src/day-menu.js";
import { dayMeasures } from "../../src/day-measures.js";
import { DAY_PLAN } from "../../src/day-plan.js";
import { sceneAt } from "../../src/day-scene.js";
import { runDay } from "../../src/day.js";
import { createPlan, moodOf } from "../day-draw.js";
import { el, fixed } from "../dom.js";

/**
 * The tab « Journée » (Sami, 1/11/2026, docs/journee.md): the showcase's day, computed once and replayed. The panel and
 * the view are kept from one render of the page to the next: only their numbers move, frame by frame, so a click is never
 * lost and the plan stays fluid. A plan changed by hand is played as soon as it is applied, a refused one says why.
 */
const SPEEDS = [15, 60, 240];
/**
 * The gauges by card: each `[its gauge, its words]`.
 * @type {readonly [string, string[][]][]}
 */
const CARDS = [
  ["Les réserves", [["camion", "Le camion"], ["F", "Chambre froide"], ["T", "Stock tempéré"], ["G", "Conserves, céréales"], ["plats", "Plats aux frigos"], ["desserts", "Desserts aux frigos"]]],
  ["Les postes pris", [["pris:P", "Fourneaux"], ["pris:A", "Fours"], ["pris:C", "Planches"], ["pris:_", "Dressage"], ["pris:Z", "Cellule"], ["pris:L", "Plonge"]]],
  ["Le service", [["bons", "Bons en cours"], ["envoyes", "Assiettes envoyées"], ["clients", "Clients en salle"], ["partis", "Clients partis"], ["propres", "Assiettes propres"], ["assiettes", "Assiettes sales"], ["sale", "Batterie sale"]]],
  ["La salle et le bar", [["tables:pretes", "Tables dressées"], ["tables:sales", "Tables à nettoyer"], ["verres", "Verres à préparer"], ["boissons", "Boissons au bar"]]],
  ["Les déchets (kg)", [["dechet:bio", "Bac biodéchets"], ["dechet:emballages", "Bac cartons"], ["dechet:verre", "Bac verre"], ["dechet:ordures", "Bac ordures"], ["local", "Au local"]]],
];
const REDRAW_EVERY = 200;
/** The summed gauges' full bars: what the batches make. */
const fullOf = (fridge) => MENU.filter((dish) => dish.fridge === fridge).reduce((sum, dish) => sum + dish.batches * dish.portions, 0);

/** Each gauge's full bar, for this day: the number of a kind of station, or the highest its value goes. */
function topsOf({ gauges, layout }) {
  const tops = { plats: fullOf("f"), desserts: fullOf("d") };
  for (const [name, series] of Object.entries(gauges)) tops[name] = name.startsWith("pris:") ? layout.stations[name.slice(5)].length : Math.max(1, ...series.map((entry) => entry[1]));
  return tops;
}

const day = { trace: null, plan: null, t: 0, speed: 60, playing: false, last: 0, seed: 1, text: DAY_PLAN, error: "", ms: 0, drawnAt: 0, hover: null, tops: {} };
const parts = { panel: null, view: null, stage: null, clock: null, phase: null, band: null, play: null, seek: null, speeds: new Map(), gauges: new Map(), cooks: null, review: null, detail: null, note: null, error: null };

/** Computes the day on the plan and seed asked; a plan refused keeps the last one. */
function compute() {
  const t0 = performance.now();
  try {
    day.trace = runDay({ text: day.text, seed: day.seed });
    day.error = "";
    day.ms = Math.round(performance.now() - t0);
    day.t = Math.max(day.trace.start, Math.min(day.t || day.trace.start, day.trace.end));
    day.tops = topsOf(day.trace);
    day.plan = createPlan(day.trace.layout);
    drawReview();
    parts.stage?.replaceChildren(day.plan.root);
    drawBand();
  } catch (error) {
    day.error = `Plan refusé : ${error.message}`;
  }
  if (parts.error) parts.error.textContent = day.error;
}

/** The day's review, in a sentence. */
function drawReview() {
  if (!parts.review) return;
  const one = dayMeasures(day.trace);
  parts.review.textContent = `${one.guests} clients à ${one.tables} tables, ${one.plates} assiettes. Un bon : ${fixed(one.ticketMean)} min en moyenne, ${fixed(one.ticketMax)} au pire. Une table : ${fixed(one.tableMean)} min, et ${fixed(one.waitedMean)} min d'attente à l'entrée en moyenne (${fixed(one.waitedMax)} au pire). Au bar : ${one.bar.poured} verres. Déchets : ${fixed(one.waste.bio + one.waste.emballages + one.waste.verre + one.waste.ordures)} kg, dont ${one.waste.bioPerGuest} g de biodéchets par client. Fermé à ${one.closedAt}.`;
}

/** Where second `t` falls on the band, in percent. */
const shareOf = (t) => (100 * (t - day.trace.start)) / (day.trace.end - day.trace.start || 1);

/** The band of the phases, each a button that jumps to it; a cursor on the present. */
function drawBand() {
  if (!parts.band) return;
  const phases = day.trace.phases.filter((phase) => phase.from < day.trace.end);
  parts.band.replaceChildren(
    ...phases.map((phase, i) => {
      const next = phases[i + 1]?.from ?? day.trace.end;
      const button = el("button", { type: "button", class: "quiet", style: `flex: ${next - phase.from} 1 0` }, phase.label);
      button.addEventListener("click", () => jump(phase.from));
      return button;
    }),
    el("span", { class: "day-cursor" }),
  );
}

function jump(t) {
  day.t = t;
  drawNow();
}

/** One gauge's row: its name, its bar and its number. */
function gaugeRow([name, label]) {
  const bar = el("span", { class: "day-bar" }, el("span", {}));
  const number = el("span", { class: "day-number" }, "0");
  parts.gauges.set(name, { bar: bar.firstChild, number });
  return el("div", { class: "day-gauge" }, el("span", {}, label), bar, number);
}

function drawGauges(scene) {
  for (const [name, { bar, number }] of parts.gauges) {
    const value = scene.gauges[name] ?? 0;
    const top = day.tops[name] ?? 1;
    bar.style.width = `${(100 * value) / top}%`;
    number.textContent = name === "local" || name.startsWith("dechet:") ? fixed(value / 1000) : String(value);
  }
}

/** The line of each cook: their mark, what they are doing. */
function drawCooks(scene) {
  const cooks = scene.people.filter((one) => one.kind === "cook");
  parts.cooks.replaceChildren(
    ...cooks.map((cook) =>
      el(
        "li",
        { class: "day-cook", "data-mood": moodOf(cook) },
        el("span", { class: "day-chip" }, cook.mark),
        el("span", { class: "day-doing", title: wordsOf(cook) }, `${cook.name} : ${cook.label || "attend"}`),
      ),
    ),
  );
}

/** Who someone is and what they are doing; for a cook, how they feel. */
function wordsOf(person) {
  const body = person.kind === "cook" ? ` (soif ${Math.round(100 * person.thirst)} %, fatigue ${Math.round(100 * person.fatigue)} %)` : "";
  return `${person.name} : ${person.label || "attend"}${body}`;
}

/** The panel's and the view's numbers, a few times a second. */
function drawWords(scene) {
  parts.clock.textContent = scene.clock;
  parts.phase.textContent = scene.phase.label;
  parts.band.querySelector(".day-cursor")?.setAttribute("style", `left: ${shareOf(scene.t)}%`);
  parts.seek.max = String(day.trace.end);
  parts.seek.min = String(day.trace.start);
  parts.seek.value = String(Math.round(scene.t));
  for (const button of parts.band.querySelectorAll("button")) button.classList.toggle("on", button.textContent === scene.phase.label);
  drawGauges(scene);
  drawCooks(scene);
  const hovered = scene.people.find((one) => one.id === day.hover);
  parts.detail.textContent = hovered ? wordsOf(hovered) : `${scene.people.length} personnes sur le plan`;
  parts.note.textContent = `Journée calculée en ${day.ms} ms, ${day.trace.layout.paths.size} chemins gardés.`;
}

function drawNow() {
  const scene = sceneAt(day.trace, day.t);
  day.plan.draw(scene);
  drawWords(scene);
}

/** One frame: the clock moves on at the speed asked, the plan follows, the words a few times a second. */
function frame(now) {
  if (!day.playing) return;
  day.t = Math.min(day.trace.end, day.t + ((now - day.last) / 1000) * day.speed);
  day.last = now;
  if (!parts.view.isConnected) return setPlaying(false);
  const scene = sceneAt(day.trace, day.t);
  day.plan.draw(scene);
  if (now - day.drawnAt > REDRAW_EVERY) {
    drawWords(scene);
    day.drawnAt = now;
  }
  if (day.t >= day.trace.end) return setPlaying(false);
  requestAnimationFrame(frame);
}

function setPlaying(playing) {
  day.playing = playing;
  parts.play.textContent = playing ? "Pause" : "Jouer";
  if (!playing) return drawNow();
  if (day.t >= day.trace.end) day.t = day.trace.start;
  day.last = performance.now();
  requestAnimationFrame(frame);
}

function setSpeed(speed) {
  day.speed = speed;
  for (const [value, button] of parts.speeds) button.setAttribute("aria-pressed", String(value === speed));
}

const speedButton = (speed) => {
  const button = el("button", { type: "button", class: "quiet", "aria-pressed": String(speed === day.speed), title: `Une seconde à l'écran vaut ${speed} secondes de la journée` }, `×${speed}`);
  button.addEventListener("click", () => setSpeed(speed));
  parts.speeds.set(speed, button);
  return button;
};

/** The plan's text, to change by hand, folded. */
function planEditor() {
  const area = el("textarea", { rows: "27", spellcheck: "false", wrap: "off", "aria-label": "Le plan de la journée, en texte" }, day.text);
  const apply = el("button", { type: "button" }, "Appliquer le plan");
  apply.addEventListener("click", () => {
    day.text = area.value;
    compute();
    if (!day.error) drawNow();
  });
  parts.error = el("p", { class: "error", role: "alert" }, day.error);
  return el("details", { class: "day-editor" }, el("summary", {}, "Modifier le plan"), area, apply, parts.error);
}

function seedField() {
  const input = el("input", { type: "number", min: "1", value: String(day.seed) });
  input.addEventListener("change", () => {
    day.seed = Math.max(1, Math.floor(Number(input.value)) || 1);
    compute();
    drawNow();
  });
  return el("label", {}, "Journée n°", input);
}

/** What the marks and their rings mean. */
const legend = () =>
  el(
    "ul",
    { class: "day-legend" },
    el("li", {}, el("span", { class: "day-dot cook" }), "un cuisinier"),
    el("li", {}, el("span", { class: "day-dot waiter" }), "un serveur, le barman"),
    el("li", {}, el("span", { class: "day-dot guest" }), "un client, une couleur par table"),
    el("li", {}, el("span", { class: "day-dot low" }), "soif ou fatigue"),
    el("li", {}, el("span", { class: "day-dot bad" }), "au bout"),
  );

function buildPanel() {
  parts.play = el("button", { type: "button" }, "Jouer");
  parts.play.addEventListener("click", () => setPlaying(!day.playing));
  parts.note = el("p", { class: "hint" }, "");
  parts.panel = el("section", { class: "panel" }, el("h2", {}, "La journée"), el("div", { class: "row-buttons" }, parts.play, ...SPEEDS.map(speedButton)), seedField(), legend(), parts.note, planEditor());
}

function buildView() {
  parts.clock = el("strong", { class: "day-clock" }, "");
  parts.phase = el("span", { class: "day-phase" }, "");
  parts.band = el("div", { class: "day-band" });
  parts.seek = el("input", { type: "range", class: "day-seek", "aria-label": "L'heure de la journée", step: "60" });
  parts.seek.addEventListener("input", () => jump(Number(parts.seek.value)));
  parts.stage = el("div", { class: "day-stage" });
  parts.cooks = el("ul", { class: "day-cooks" });
  parts.detail = el("p", { class: "hint" }, "");
  parts.stage.addEventListener("pointermove", (event) => {
    const who = /** @type {Element} */ (event.target).closest?.("[data-who]");
    day.hover = who ? Number(who.getAttribute("data-who")) : null;
  });
  parts.review = el("p", { class: "hint" }, "");
  const gauges = CARDS.map(([title, rows]) => el("section", { class: "card" }, el("h3", {}, title), ...rows.map(gaugeRow)));
  const side = el("div", { class: "day-side" }, el("section", { class: "card" }, el("h3", {}, "La brigade"), parts.cooks, parts.detail), ...gauges, el("section", { class: "card" }, el("h3", {}, "Le bilan de la journée"), parts.review));
  parts.view = el("div", { class: "day-view" }, el("div", { class: "day-head" }, parts.clock, parts.phase), parts.band, parts.seek, el("div", { class: "day-layout" }, parts.stage, side));
}

/** Builds the tab once, the first time it opens, and shows the first moment of the day. */
function ensureBuilt() {
  if (parts.view) return;
  buildPanel();
  buildView();
  compute();
  drawNow();
}

export function dayPanel() {
  ensureBuilt();
  return parts.panel;
}

export function dayView() {
  ensureBuilt();
  return [parts.view];
}

