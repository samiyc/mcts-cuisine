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
      keyboard.pending = null;
      keyboard.message = `le service est fini (tour ${state.service.t}) : « Recommencer » ou « Service suivant » pour rejouer`;
      page.render();
      return;
    }
    keyboard.pending = key;
    // Paused: the key plays its turn at once.
    if (state.timer) return;
    page.step();
    page.render();
  });
}
