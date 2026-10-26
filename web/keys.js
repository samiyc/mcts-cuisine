import { MOVES } from "../src/replay.js";
import { isOver } from "../src/simulate.js";

/**
 * The chef's keys (Sami, 23/10/2026): Z Q S D (or the arrows) to move, E to work the station beside him, kept for the
 * next turn while the service plays, played at once when it is paused. Only in the tab « Service », with the chef at
 * the keyboard and no replay playing; a key in a form field is the field's. `page`: the page's `state`, `keyboard`,
 * `manual`, `replays`, `step`, `render`.
 */
const typing = (event) => Boolean(/** @type {HTMLElement} */ (event.target).closest?.("input, textarea, select")) || event.ctrlKey || event.altKey || event.metaKey;
const listening = (page) => page.state.tab === "service" && page.manual() && !page.replays.playing;

/** The chef's key of `event`, or null. */
function chefKey(page, event) {
  if (!listening(page) || typing(event)) return null;
  const key = event.key.toLowerCase();
  return key === "e" || MOVES[key] ? key : null;
}

export function wireChefKeys(page) {
  document.addEventListener("keydown", (event) => {
    const key = chefKey(page, event);
    if (!key) return;
    event.preventDefault();
    const { state, keyboard } = page;
    // The service over, a key does nothing: say so, or it looks like a freeze (Sami, 23/10).
    if (isOver(state.service)) {
      keyboard.pending = [];
      keyboard.message = `le service est fini (tour ${state.service.t}) : « Recommencer » ou « Service suivant » pour rejouer`;
      page.render();
      return;
    }
    // A few turns ahead at most: a key held down does not pile up a long walk.
    if (keyboard.pending.length < 3 * pace(state)) keyboard.pending.push(key);
    // Paused: a turn plays once it is full (its steps, or an E); until then the chef says how many steps are left.
    if (state.timer) return;
    if (full(keyboard.pending, pace(state))) page.step();
    else keyboard.message = `encore ${pace(state) - keyboard.pending.length} pas pour ce tour, ou E`;
    page.render();
  });
}

/** The cells a turn walks (service-legs.js). */
const pace = (state) => state.setup.pace ?? 1;

/** Do the keys waiting make a turn: an E first, or as many steps as the pace? */
const full = (keys, steps) => keys[0] === "e" || keys.length >= steps;

/**
 * The keys this turn plays, taken off `keyboard.pending`: an E alone, or up to `steps` moves (the pace, Sami 26/10: the
 * chef walks as fast as the robots); an E after moves waits for the next turn.
 */
export function turnKeys(keyboard, steps) {
  if (keyboard.pending[0] === "e") return keyboard.pending.splice(0, 1);
  const moves = keyboard.pending.findIndex((key) => key === "e");
  return keyboard.pending.splice(0, Math.min(steps, moves === -1 ? keyboard.pending.length : moves));
}
