/**
 * The keys of the service's player, as on a video (Sami, 29/10/2026, as mcts-urgences' web/replay-keys.js): space plays
 * or pauses; the left and right arrows go 10 turns back or on, 50 with Shift (a service is 200 turns); the up and down
 * arrows play faster or slower; 0 to 9, on the keypad or the row of figures, go to 0 %, 10 %… 90 % of the service.
 * Which keys reach it is the page's to say (player.js: the chef at the keyboard keeps his), as at the warehouse.
 *
 * `player`: `{ t(), end(), seek(t), toggle(), faster(way) }`, the turn shown, the last one, and what the keys do.
 */
export const PLAYER_HINT = "Espace : lecture ou pause ; ← → : 10 tours, avec Maj : 50 ; ↑ ↓ : plus ou moins vite ; 0 à 9 : de 0 à 90 % du service";
export const CHEF_PLAYER_HINT = "Espace : lecture ou pause (les flèches sont au chef)";

/**
 * Whether a key may go to the player: no modifier but Shift, not in a field (an arrow moves its value); on a button,
 * space presses the button.
 */
function forThePlayer(event) {
  const target = /** @type {HTMLElement} */ (event.target);
  if (event.ctrlKey || event.altKey || event.metaKey || target.closest?.("input, textarea, select")) return false;
  return !(event.key === " " && target.closest?.("button"));
}

/**
 * The tenth a key goes to: its figure, else the figure of its place on the row (an AZERTY keyboard) or on the keypad
 * (num lock off, but for its arrows); null for another key.
 */
function tenthOf(event) {
  const figure = /^\d$/.test(event.key) ? event.key : (/^(?:Digit|Numpad)(\d)$/.exec(event.code)?.[1] ?? null);
  return figure === null ? null : Number(figure);
}

const MOVES = {
  ArrowLeft: (player, event) => player.seek(player.t() - (event.shiftKey ? 50 : 10)),
  ArrowRight: (player, event) => player.seek(player.t() + (event.shiftKey ? 50 : 10)),
  ArrowUp: (player) => player.faster(1),
  ArrowDown: (player) => player.faster(-1),
};

/** The turn `t` kept within the service, from its start to `end`. */
export const within = (t, end) => Math.max(0, Math.min(end, t));

/** The speed after `current` in `speeds` (`[[value, label]]`, slowest first), faster (`way` 1) or slower (-1). */
export function nextSpeed(speeds, current, way) {
  const at = speeds.findIndex(([value]) => Number(value) === current);
  return Number(speeds[Math.max(0, Math.min(speeds.length - 1, at + way))][0]);
}

/** What a key does to the player, or null if it is not the player's: the arrows before the figures (the keypad's). */
function moveOf(player, event) {
  if (event.key === " ") return () => player.toggle();
  if (MOVES[event.key]) return () => MOVES[event.key](player, event);
  const tenth = tenthOf(event);
  return tenth === null ? null : () => player.seek(Math.round((player.end() * tenth) / 10));
}

/** A key pressed while the service is shown; true if it was the player's. */
export function playerKey(player, event) {
  const move = forThePlayer(event) ? moveOf(player, event) : null;
  if (!move) return false;
  event.preventDefault();
  move();
  return true;
}
