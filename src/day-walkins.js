import { atTheCounter } from "./day-bar.js";
import { addPerson, addStock, at, segment, walkTo } from "./day-engine.js";
import { HOUR, MINUTE } from "./day-program.js";

/**
 * Those who come without a booking (Sami, 1/11/2026, docs/journee.md: a peak for the bar): small groups, most of them just
 * after work, stand at the bar for a drink or two, then leave, or ask for a table if one is open. Bar stools kept for
 * walk-ins are an operator's practice (eGullet, docs/recherche/journee.md); no figure was found on such a peak or on how long
 * people stay at a bar: all these are hypotheses (question 38).
 */
export const WALK_INS = Object.freeze({ groups: 26, from: 18.25 * HOUR, peak: 19.1 * HOUR, to: 21 * HOUR, stayFrom: 20, stayTo: 45, second: 0.5, wantsTable: 0.3, roomAtTheBar: 36 });

/** When they come: a triangular draw, peaking early in the evening. */
function drawArrival(rng) {
  const { from, peak, to } = WALK_INS;
  const u = rng.next();
  const split = (peak - from) / (to - from);
  return u < split ? from + Math.sqrt(u * (to - from) * (peak - from)) : to - Math.sqrt((1 - u) * (to - from) * (to - peak));
}

/** The group leaves the bar and goes out by its door. */
function leaveTheBar(world, group) {
  addStock(world, "bar:debout", -group.size);
  addStock(world, "clients", -group.size);
  addStock(world, "partis", group.size);
  world.log.push({ type: "barGroup", id: group.id, size: group.size, seconds: world.t - group.arrivedAt });
  for (const person of group.members) {
    person.carry = null;
    walkTo(world, person, { cell: world.layout.entry, label: "s'en va" }, () => segment(world, person, { kind: "gone" }));
  }
}

/** Their drink finished: another one, a table if they want one and one is open, or the door. */
function afterADrink(world, group, { seatWalkIn }) {
  if (!group.again && world.rng.next() < WALK_INS.second) {
    group.again = true;
    return atTheCounter(world, group, () => sip(world, group, { seatWalkIn }));
  }
  if (world.rng.next() < WALK_INS.wantsTable && seatWalkIn(world, group)) {
    addStock(world, "bar:debout", -group.size);
    world.log.push({ type: "walkInTable", id: group.id, size: group.size, t: world.t });
    return;
  }
  leaveTheBar(world, group);
}

/** They stay a while with their glass. */
function sip(world, group, hooks) {
  const stay = WALK_INS.stayFrom + world.rng.next() * (WALK_INS.stayTo - WALK_INS.stayFrom);
  at(world, world.t + stay * MINUTE, () => afterADrink(world, group, hooks));
}

/** A group comes in, if the bar has room for it. */
function arrive(world, group, hooks) {
  if ((world.stock.get("bar:debout") ?? 0) + group.size > WALK_INS.roomAtTheBar) {
    world.log.push({ type: "barFull", id: group.id, size: group.size, t: world.t });
    return;
  }
  group.arrivedAt = world.t;
  group.members = Array.from({ length: group.size }, (_, i) => addPerson(world, { name: `Au bar ${group.id + 1}.${i + 1}`, kind: "guest", group: group.id }, world.layout.entry));
  addStock(world, "clients", group.size);
  addStock(world, "bar:debout", group.size);
  hooks.standAtBar(world, group);
  atTheCounter(world, group, () => sip(world, group, hooks));
}

/** The evening's walk-ins: `hooks` are the dining room's, to stand at the bar and to take a table. */
export function startWalkIns(world, { firstId, ...hooks }) {
  addStock(world, "bar:debout", 0);
  for (let n = 0; n < WALK_INS.groups; n += 1) {
    const group = { id: firstId + n, size: 1 + world.rng.int(3), table: null, members: [], booking: null, walkIn: true, again: false };
    at(world, drawArrival(world.rng), () => arrive(world, group, hooks));
  }
}
