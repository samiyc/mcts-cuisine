import { KITCHENS, RECIPES } from "../../src/kitchens.js";
import { gapsOf } from "../../src/replay.js";
import { RULE_LABELS } from "../../src/rules.js";
import { el, fixed } from "../dom.js";

/**
 * Replays (Sami, 23/10/2026): the keys of a service played at the keyboard, kept in this browser (the last
 * `KEPT_REPLAYS`), downloaded as a file for `npm run replay`, or played again in the tab « Service ». While a replay
 * plays, the keys come from it, not from the keyboard. The tab « Replays » (26/10): the kept ones, a file to play
 * again, and the gaps of the one last analysed.
 */
const KEPT_REPLAYS = 20;
const REPLAYS_KEY = "cuisine-replays";

export const replays = {
  inputs: [],
  playing: null,
  gaps: null,
  // The service's start: every save of it carries this date, so it replaces the last one (here and in replays/).
  startedAt: new Date().toISOString(),
  load() {
    try {
      return JSON.parse(localStorage.getItem(REPLAYS_KEY) ?? "[]");
    } catch {
      return [];
    }
  },
  keep(replay) {
    // Also to the project's replays/ folder, through the page server (out of git; nothing if no server takes it).
    fetch("/api/replays", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(replay) }).catch(() => {});
    try {
      const kept = [replay, ...this.load().filter((one) => one.savedAt !== replay.savedAt)].slice(0, KEPT_REPLAYS);
      localStorage.setItem(REPLAYS_KEY, JSON.stringify(kept));
    } catch {
      // Storage refused (private window, full): the replay can still be downloaded.
    }
  },
};

export function download(replay) {
  const link = el("a", { href: URL.createObjectURL(new Blob([JSON.stringify(replay, null, 1)], { type: "application/json" })), download: `cuisine-${replay.kitchenId}-service${replay.seed}-${replay.savedAt.slice(0, 16).replace(/[:T]/g, "-")}.json` });
  document.body.append(link);
  link.click();
  link.remove();
}

/**
 * A replay of the list: downloaded, played again, or analysed (a few seconds of play: the page says so, then
 * computes). `page`: the page's `state`, `startReplay`, `render`.
 */
export function replayClicked(page, saved) {
  const replay = replays.load()[Number(saved.dataset.replay)];
  if (saved.dataset.do === "download") return download(replay);
  if (saved.dataset.do === "play") return page.startReplay(replay);
  page.state.busy = "Analyse des écarts…";
  page.render();
  setTimeout(() => {
    replays.gaps = gapsOf(replay);
    page.state.busy = "";
    page.render();
  }, 30);
}

/** A replay file chosen: played again, or refused in words. */
export async function replayFile(page, input) {
  try {
    page.startReplay(JSON.parse(await input.files[0].text()));
  } catch {
    page.state.error = "Fichier illisible : ce n'est pas un replay de la cuisine.";
  }
  page.render();
}

/** The panel: this service's keys to download, a file to play again. `ctx`: the page's `manual`. */
export function replaysPanel({ manual }) {
  const keys = replays.inputs.length;
  return el(
    "section",
    { class: "panel" },
    el("h2", {}, "Les replays du chef au clavier"),
    el("p", { class: "hint" }, `Chaque service joué au clavier est gardé ici (les ${KEPT_REPLAYS} derniers), et dans le dossier replays/ du projet quand la page passe par son serveur. Rejoué, il s'ouvre dans l'onglet Service.`),
    manual() && keys > 0 ? el("button", { type: "button", "data-action": "downloadReplay" }, `Télécharger ce service (${keys} touches)`) : null,
    el("label", {}, "Rejouer un fichier", el("input", { type: "file", accept: "application/json,.json", "data-file": "replay" })),
    el("p", { class: "hint" }, "En ligne de commande : npm run replay -- fichier.json dit ce qui a semblé anormal et à quel tour ; --gaps, les écarts des choix du chef."),
  );
}

const ACTIONS = [
  ["play", "Rejouer"],
  ["download", "Télécharger"],
  ["gaps", "Analyser les écarts"],
];

function keptItem(replay, i) {
  const what = `${replay.savedAt.slice(0, 16).replace("T", " ")} · ${KITCHENS[replay.kitchenId]?.label ?? replay.kitchenId} · service ${replay.seed} · ${RULE_LABELS[replay.rule] ?? replay.rule} · ${replay.inputs.length} touches `;
  const buttons = ACTIONS.flatMap(([action, label]) => [el("button", { type: "button", class: "quiet", "data-replay": String(i), "data-do": action }, label), " "]);
  return el("li", {}, what, ...buttons);
}

/** The gaps of the replay last analysed: each order the chef took, the best one with hindsight, what it cost. */
function gapsTable(found) {
  const name = (decision, id) => {
    const option = decision.options.find((one) => one.id === id);
    return `${id}. ${RECIPES[option.recipe].label}${option.status === "ready" ? " (prête sur le feu)" : ""}`;
  };
  const head = ["Tour", "le chef a pris", "le meilleur avec le recul", "plats perdus"].map((label, i) => el("th", { class: i === 3 ? "num" : null }, label));
  const row = (decision) => {
    const lost = decision.gap > 0;
    return el("tr", { class: lost ? "late" : null }, el("td", {}, String(decision.t)), el("td", {}, name(decision, decision.chosen)), el("td", {}, lost ? name(decision, decision.best) : "le même"), el("td", { class: "num" }, lost ? fixed(decision.gap) : "—"));
  };
  return el(
    "div",
    { class: "gaps" },
    el("h3", {}, `Les choix du chef : ${found.decisions.length}, dont ${found.agreed} aussi bons que le meilleur ; ${fixed(found.gap)} plat(s) à temps perdu(s)`),
    el("p", { class: "hint" }, "Avec le recul : à chaque commande prise, chaque commande possible est rejouée 60 tours (puis le chef « le plus urgent », les robots « le plat le plus rapide », les vraies commandes à venir). Un écart dit où un choix a coûté, pas ce qu'on pouvait deviner sur le moment."),
    el("div", { class: "scroll" }, el("table", {}, el("thead", {}, el("tr", {}, ...head)), el("tbody", {}, ...found.decisions.map(row)))),
  );
}

/** The view: the replays kept in this browser, and the gaps of the one last analysed. `ctx`: the page's `state`. */
export function replaysView({ state }) {
  const kept = replays.load();
  const list = kept.length > 0 ? el("ol", { class: "replay-list" }, ...kept.map(keptItem)) : el("p", { class: "hint" }, "Aucun service gardé : choisissez « c'est vous, au clavier » dans l'onglet Service, et jouez.");
  return [el("h2", {}, `Gardés dans ce navigateur : ${kept.length}`), state.busy ? el("p", { class: "summary", role: "status" }, state.busy) : null, list, replays.gaps ? gapsTable(replays.gaps) : null].filter(Boolean);
}
