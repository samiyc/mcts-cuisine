import { stationFor } from "./service-legs.js";

/**
 * The dish room, « la plonge » (Sami, 26/10/2026, the evening; docs/recherche/production.md): plates are a resource.
 * The kitchen has `stock` clean plates; a dish takes one when it is served (its serving step waits for one), and the
 * plate comes back dirty `back` turns later (the guest has eaten). A cook washes them at a sink `L`, `rack` at a time,
 * in `wash` turns: a robot of role `plonge`, or a free robot with nothing to cook, or any free robot first when no
 * clean plate is left. `setup.plates`, off by default; the figures are hypotheses.
 */
export const PLATES = Object.freeze({ stock: 15, back: 50, rack: 6, wash: 3 });

/** The plates of a service, all clean; null without the setting. */
export const platesOf = (setup) => (setup.plates ? { clean: setup.plates.stock, dirty: 0, returning: [], washed: 0, waited: 0, lowest: setup.plates.stock } : null);

/** Their copy for a world of the search. */
export const clonePlates = (plates) => plates && { ...plates, returning: [...plates.returning] };

/** At the start of a turn: the plates whose guests have eaten come back dirty. */
export function platesBack(state) {
  const { plates } = state;
  if (!plates) return;
  const due = plates.returning.filter((t) => t <= state.t).length;
  if (due === 0) return;
  plates.returning = plates.returning.filter((t) => t > state.t);
  plates.dirty += due;
}

/** May `cook` start serving: a plate already in hand, or a clean one taken now; false (he waits) when none is left. */
export function plateFor(state, cook) {
  const { plates } = state;
  if (!plates || cook.plate) return true;
  if (plates.clean === 0) {
    plates.waited += 1;
    return false;
  }
  plates.clean -= 1;
  plates.lowest = Math.min(plates.lowest, plates.clean);
  cook.plate = true;
  return true;
}

/** `cook`'s dish leaves on its plate: it comes back dirty `back` turns later. */
export function plateGone(state, cook) {
  if (!state.plates || !cook.plate) return;
  cook.plate = false;
  state.plates.returning.push(state.t + state.setup.plates.back);
}

/** `cook` drops his dish (burnt, given up): the plate he held is clean again. */
export function plateDropped(state, cook) {
  if (!state.plates || !cook.plate) return;
  cook.plate = false;
  state.plates.clean += 1;
}

/** Should `cook` wash up: plates dirty, a sink he can reach, and either his role, or nothing else to do, or no clean plate left? */
function shouldWash(state, cook, idle) {
  const { plates } = state;
  if (!plates || plates.dirty === 0 || cook.kind !== "robot") return false;
  return cook.role === "plonge" || idle || plates.clean === 0;
}

/** A free robot washes a rack at a sink when it should: true when it set off. */
export function washUp(state, cook, idle) {
  if (!shouldWash(state, cook, idle)) return false;
  const step = { type: "wash", kind: "L", turns: state.setup.plates.wash };
  if (!stationFor(state, cook, step)) return false;
  const rack = Math.min(state.setup.plates.rack, state.plates.dirty);
  state.plates.dirty -= rack;
  Object.assign(cook, { order: null, steps: [step], step: 0, phase: "next", rack });
  state.log.push({ t: state.t, type: "wash", cook: cook.id, plates: rack });
  return true;
}

/** The rack washed: its plates are clean. */
export function washed(state, cook) {
  state.plates.clean += cook.rack;
  state.plates.washed += cook.rack;
  cook.rack = 0;
}

/** The dish room's measures: the plates washed, the turns a cook waited for a clean plate, the fewest clean at once. */
export const plateMeasures = (state) => (state.plates ? { platesWashed: state.plates.washed, waitPlate: state.plates.waited, fewestPlates: state.plates.lowest } : {});
