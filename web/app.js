import { KITCHENS } from "../src/kitchens.js";
import { MOVES, REPLAY_FORMATS, pressKey, replayOf, startsFirst } from "../src/replay.js";
import { HUMANS, RULES, compareRules, summaryOf } from "../src/rules.js";
import { searchRule } from "../src/search.js";
import { beginTurn, createService, drawOrders, interact, isOver, measuresOf, runService, steer, stepService } from "../src/simulate.js";
import { firstTab, showTab, wireFold, wireTabs } from "./chrome.js";
import { turnKeys, wireChefKeys } from "./keys.js";
import { kitchenFrom, kitchenPanel, kitchenView } from "./tabs/kitchen.js";
import { download, replayClicked, replayFile, replays, replaysPanel, replaysView } from "./tabs/replays.js";
import { servicePanel, serviceView } from "./tabs/service.js";
import { statsPanel, statsView } from "./tabs/stats.js";

/**
 * The page, in tabs (Sami, 26/10/2026, lopin's layout as mcts-urgences took it): « Service » plays a service in the
 * chosen kitchen, the robots under the chosen rule beside the chosen cook (simulated, or you at the keyboard), turn
 * by turn or all at once; « Cuisine » edits the kitchen (a new kitchen is a new text); « Replays » keeps the services
 * played at the keyboard; « Stats » compares the rules on the same services. The settings of the tab open are in the
 * panel on the left, which folds. The search (src/search.js) thinks for a while at each choice: its services are
 * played turn by turn, the page breathing between two. What the page shows is computed in view.js and drawn by
 * board.js and tabs/; this module keeps the state, plays, and listens.
 */
const COMPARED = 100;
const COMPARED_WITH_SEARCH = 12;
const TAB_NAMES = ["service", "cuisine", "replays", "stats"];
const TABS = { service: [servicePanel, serviceView], cuisine: [kitchenPanel, kitchenView], replays: [replaysPanel, replaysView], stats: [statsPanel, statsView] };
const layout = document.getElementById("layout");
const sidebar = document.getElementById("sidebar");
const app = document.getElementById("app");
const state = { tab: firstTab(TAB_NAMES), kitchenId: "petite", setup: { ...KITCHENS.petite }, rule: "search", human: "random", seed: 1, speed: 4, service: null, timer: null, compared: null, error: "", busy: "", run: 0 };
const humanRule = () => HUMANS[state.human] ?? null;
/** The chef at the keyboard (Sami, 23/10): his next move, kept until the next turn, and what his last one did. */
const manual = () => state.human === "clavier";
const keyboard = { pending: [], message: "" };
const ruleOf = (name) => (name === "search" ? searchRule() : RULES[name]);
const breathe = () => new Promise((resolve) => setTimeout(resolve, 0));
const ctx = { state, keyboard, replays, manual, COMPARED, COMPARED_WITH_SEARCH };

const currentReplay = () => ({ ...replayOf({ kitchenId: state.kitchenId, setup: state.setup, seed: state.seed, rule: state.rule, inputs: replays.inputs }), savedAt: replays.startedAt });
/** Every this many turns at the keyboard, the service so far is kept: a page that freezes still leaves its replay. */
const KEEP_EVERY = 20;
/** Keeps the service just played at the keyboard, if a key was pressed. */
function keepReplay() {
  if (manual() && !replays.playing && replays.inputs.length > 0) replays.keep(currentReplay());
}

/** Loads `replay` and plays it from the start in the tab « Service », its keys at their turns. */
function startReplay(replay) {
  if (!REPLAY_FORMATS.includes(replay?.format)) {
    state.error = "Ce fichier n'est pas un replay de la cuisine.";
    return;
  }
  Object.assign(state, { kitchenId: KITCHENS[replay.kitchenId] ? replay.kitchenId : state.kitchenId, setup: replay.setup, seed: replay.seed, rule: replay.rule, human: "clavier", error: "", compared: null });
  restart();
  replays.playing = { inputs: [...replay.inputs], format: replay.format };
  keyboard.message = `Replay du ${replay.savedAt.slice(0, 16).replace("T", " à ")} : ${replay.inputs.length} touches.`;
  openTab("service");
}

function restart() {
  stop();
  keepReplay();
  Object.assign(replays, { inputs: [], playing: null, startedAt: new Date().toISOString() });
  Object.assign(state, { run: state.run + 1, busy: "" });
  state.service = createService(state.setup, drawOrders(state.seed, state.setup), { human: humanRule() ? state.human : null, seed: state.seed, manual: manual() });
  Object.assign(keyboard, { pending: [], message: manual() ? "Jouer, puis Z Q S D pour bouger le chef, E pour prendre, travailler, poser, servir." : "" });
}
function stop() {
  clearInterval(state.timer);
  state.timer = null;
  keepReplay();
}

/** Before the key (Sami, 23/10: a soup ready this turn, or a gesture just done, refused the chef's key); an old replay keeps its order, the key first. */
function startTurn() {
  if (state.service.cursor === null && startsFirst(replays.playing?.format)) beginTurn(state.service, humanRule());
}
/** A replay plays the keys of this turn. */
function replayKeys() {
  const { inputs } = replays.playing;
  while (inputs.length && inputs[0].t === state.service.t) {
    const said = pressKey(state.service, inputs.shift().key);
    if (said) keyboard.message = said;
  }
}
/**
 * The keys pressed for this turn (keys.js `turnKeys`: up to `pace` steps, or an E), each recorded with its turn; the
 * answer to the last one only (an old one, « le chef coupe… », left on screen looked like a freeze).
 */
function pressPending() {
  for (const key of turnKeys(keyboard, state.setup.pace ?? 1)) {
    replays.inputs.push({ t: state.service.t, key });
    keyboard.message = (key === "e" ? interact(state.service) : steer(state.service, ...MOVES[key])) ?? "";
  }
}
/** One turn: the turn starts (gestures ended, soups ready), the chef's pending key, then everyone. */
function step() {
  startTurn();
  if (replays.playing) replayKeys();
  else if (manual() && keyboard.pending.length > 0) pressPending();
  stepService(state.service, ruleOf(state.rule), humanRule());
  if (isOver(state.service) || state.service.t % KEEP_EVERY === 0) keepReplay();
}

/** Plays `service` to its end, the robots under `rule`, breathing every turn; false if a newer run started meanwhile. */
async function playOut(service, rule, run, label) {
  while (!isOver(service)) {
    stepService(service, rule, humanRule());
    state.busy = `${label} : tour ${service.t} / ${service.setup.service}`;
    render();
    await breathe();
    if (run !== state.run) return false;
  }
  return true;
}

async function finish() {
  stop();
  const run = ++state.run;
  if (state.rule !== "search") {
    while (!isOver(state.service)) step();
  } else if (!(await playOut(state.service, ruleOf("search"), run, "La recherche réfléchit"))) {
    return;
  }
  state.busy = "";
  render();
}

/** The rules and the search on the same few services, breathing between two turns of the search. */
async function compareWithSearch() {
  stop();
  const run = ++state.run;
  const human = humanRule();
  const runs = { ...Object.fromEntries(Object.keys(RULES).map((name) => [name, []])), search: [] };
  for (let i = 0; i < COMPARED_WITH_SEARCH; i += 1) {
    for (const [name, rule] of Object.entries(RULES)) runs[name].push(runService(state.setup, state.seed + i, rule, human).measures);
    const service = createService(state.setup, drawOrders(state.seed + i, state.setup), { human: human ? state.human : null, seed: state.seed + i });
    if (!(await playOut(service, ruleOf("search"), run, `Comparaison, service ${i + 1} sur ${COMPARED_WITH_SEARCH}`))) return;
    runs.search.push(measuresOf(service));
  }
  Object.assign(state, { compared: { services: COMPARED_WITH_SEARCH, rows: summaryOf(runs) }, busy: "" });
  render();
}
function play() {
  stop();
  state.timer = setInterval(() => {
    if (isOver(state.service)) stop();
    else step();
    render();
  }, 1000 / state.speed);
}

function render() {
  const [panel, view] = TABS[state.tab];
  sidebar.replaceChildren(panel(ctx));
  app.replaceChildren(...view(ctx));
}

function openTab(name) {
  state.tab = name;
  showTab(name);
  render();
}

function applyKitchen(form) {
  const setup = kitchenFrom(form, state.setup);
  try {
    createService(setup, []);
    Object.assign(state, { setup, error: "", compared: null });
    restart();
  } catch (error) {
    state.error = `Cuisine refusée : ${error.message}`;
  }
}

const ACTIONS = {
  play,
  pause: stop,
  step: () => {
    stop();
    if (!isOver(state.service)) step();
  },
  finish,
  restart,
  next: () => {
    state.seed += 1;
    restart();
  },
  compare: () => {
    state.run += 1;
    Object.assign(state, { compared: { services: COMPARED, rows: compareRules(state.setup, { services: COMPARED, humanName: state.human }) }, busy: "" });
  },
  compareSearch: compareWithSearch,
  downloadReplay: () => download(currentReplay()),
};

/** What a knob sets; the others set `state[name]`. */
const KNOBS = {
  kitchen: (value) => Object.assign(state, { kitchenId: value, setup: { ...KITCHENS[value] }, error: "" }),
  seed: (value) => (state.seed = Math.max(1, Number(value) || 1)),
  speed: (value) => (state.speed = Number(value)),
};
/** A knob changed: the speed plays on, anything else starts the service again (the comparison kept for another rule only). */
function knobChanged(name, value) {
  (KNOBS[name] ?? ((one) => (state[name] = one)))(value);
  if (name === "speed") {
    if (state.timer) play();
    return;
  }
  if (name !== "rule") state.compared = null;
  restart();
}

/** The element an event came from, as the form fields it is. */
const fieldOf = (event) => /** @type {HTMLInputElement} */ (event.target);

const page = { state, startReplay, render };
layout.addEventListener("change", (event) => {
  const target = fieldOf(event);
  if (target.dataset?.file === "replay" && target.files?.[0]) return replayFile(page, target);
  if (!target.dataset?.knob) return;
  knobChanged(target.dataset.knob, target.value);
  render();
});
layout.addEventListener("click", (event) => {
  const target = fieldOf(event);
  const saved = /** @type {HTMLElement | null} */ (target.closest?.("[data-replay]"));
  if (saved) {
    replayClicked(page, saved);
    return render();
  }
  const action = /** @type {HTMLElement | null} */ (target.closest?.("[data-action]"))?.dataset.action;
  if (!ACTIONS[action]) return;
  ACTIONS[action]();
  render();
});
layout.addEventListener("submit", (event) => {
  event.preventDefault();
  applyKitchen(event.target);
  render();
});
wireTabs(TAB_NAMES, openTab);
wireFold(layout);
wireChefKeys({ state, keyboard, manual, replays, step, render });
restart();
showTab(state.tab);
render();
