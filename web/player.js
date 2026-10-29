import { isOver } from "../src/simulate.js";
import { nextSpeed, playerKey, within } from "./player-keys.js";
import { SPEEDS } from "./tabs/service.js";

/**
 * The service's player at the keyboard (Sami, 29/10/2026, player-keys.js): in the tab « Service », space plays or
 * pauses, the arrows move in the service or change its speed, the figures go to a tenth of it; none while the chef is played. Going on plays the
 * turns between; going back plays the service again from its start (a service, and its replay, replay from their
 * seed), to the turn asked. The page breathes while the search thinks. `page`: the page's `state`, `replays`,
 * `manual`, `step`, `restart`, `startReplay`, `play`, `stop`, `render`.
 */
const breathe = () => new Promise((resolve) => setTimeout(resolve, 0));
/** While a seek runs: whether the service plays on once there (space while seeking changes it). */
const seeking = { id: 0, resume: null };

/** Back to the start: the replay playing, from its first key, or the service. */
const rewind = (page) => (page.replays.playing ? page.startReplay(page.replays.playing.replay) : page.restart());

/** Plays the turns up to `target`, breathing now and then; false if something else started meanwhile. */
async function playTo(page, target, run) {
  const { state } = page;
  let breath = Date.now();
  while (state.service.t < target) {
    page.step();
    if (Date.now() - breath < 50) continue;
    state.busy = `Vers le tour ${target} : tour ${state.service.t}`;
    page.render();
    await breathe();
    if (run !== state.run) return false;
    breath = Date.now();
  }
  return true;
}

/** Moves the service shown to turn `t`, kept within it, playing on if it was playing. */
async function seek(page, t) {
  const { state } = page;
  const id = ++seeking.id;
  seeking.resume ??= state.timer !== null;
  page.stop();
  const target = within(t, state.service.setup.service);
  if (target < state.service.t) rewind(page);
  const run = ++state.run;
  const there = await playTo(page, target, run);
  if (id !== seeking.id) return;
  const resume = seeking.resume;
  seeking.resume = null;
  if (!there) return;
  state.busy = "";
  if (resume && !isOver(state.service)) page.play();
  page.render();
}

function toggle(page) {
  if (seeking.resume !== null) seeking.resume = !seeking.resume;
  else if (page.state.timer) page.stop();
  else page.play();
  page.render();
}

function faster(page, way) {
  page.state.speed = nextSpeed(SPEEDS, page.state.speed, way);
  if (page.state.timer) page.play();
  page.render();
}

export function wirePlayerKeys(page) {
  const { state } = page;
  const player = {
    t: () => state.service.t,
    end: () => state.service.setup.service,
    seek: (t) => seek(page, t),
    toggle: () => toggle(page),
    faster: (way) => faster(page, way),
  };
  document.addEventListener("keydown", (event) => {
    // The chef at the keyboard and no replay playing, the page is a game, not a player: no key is the player's, space
    // included (Sami, 29/10/2026); the chef's are his (keys.js), the player is driven by its buttons.
    const game = page.manual() && !page.replays.playing;
    if (state.tab === "service" && state.service && !game) playerKey(player, event);
  });
}
