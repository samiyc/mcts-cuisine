import { useSupply } from "./service-supply.js";

/**
 * The batch, « la coupe en série » (Sami, 26/10/2026, step 2 of docs/recherche/feuille-de-route.md;
 * docs/recherche/production.md): at a banquet, a cook who takes a dish of a course takes with it up to `batch - 1`
 * other dishes of the same course still open, and makes them together, as a caterer does: one trip to the crate, one
 * longer cut (`extra` turns a portion more: the board and the knife are set once), one big pot, all at the pass at
 * once. The dish taken leads (it carries the steps); the others follow (`batchOf`, status « batched »: nobody else is
 * offered them) until the leader is handed over, burnt or given up. `setup.banquet.batch`, 1 by default: no batch.
 */

/** The dishes following `leader` in its batch. */
export const followersOf = (state, leader) => state.upcoming.filter((order) => order.batchOf === leader.id);

/** Is `order` a banquet dish that may lead a batch: the setting on, a dish not yet started? */
const mayLead = (state, order) => (state.setup.banquet?.batch ?? 1) > 1 && order.table !== undefined && order.sendAt !== undefined;

/**
 * `cook` takes `leader` (its steps from the start, `steps`): with it, up to `batch - 1` open dishes of the same course
 * and recipe, the oldest first; each one an ingredient from the crate. The steps, the cut longer by `extra` a portion.
 */
export function formBatch(state, cook, leader, steps) {
  if (!mayLead(state, leader) || steps[0].type !== "fetch") return steps;
  const { batch, extra = 1 } = state.setup.banquet;
  const mates = state.upcoming.filter((order) => order !== leader && order.status === "open" && order.table === leader.table && order.recipe === leader.recipe).slice(0, batch - 1);
  if (mates.length === 0) return steps;
  for (const mate of mates) {
    Object.assign(mate, { status: "batched", cook: cook.id, batchOf: leader.id });
    useSupply(state, mate.recipe);
  }
  state.log.push({ t: state.t, type: "batch", cook: cook.id, order: leader.id, orders: mates.map((mate) => mate.id) });
  return steps.map((step) => (step.type === "cut" ? { ...step, turns: step.turns + mates.length * extra } : step));
}

/** The leader handed over (served, or at the pass): its followers with it, by `hand` (the same as the leader's). */
export function handFollowers(state, leader, hand) {
  for (const follower of followersOf(state, leader)) {
    delete follower.batchOf;
    hand(follower);
  }
}

/** The leader lost (burnt) or given up: its followers are open again, to make again, each on its own. */
export function releaseFollowers(state, leader) {
  for (const follower of followersOf(state, leader)) {
    delete follower.batchOf;
    Object.assign(follower, { status: "open", cook: null });
  }
}
