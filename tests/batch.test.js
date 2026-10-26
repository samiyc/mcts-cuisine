import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { BANQUET } from "../src/service-banquet.js";
import { createService, drawOrders, isOver, runService, stepService } from "../src/simulate.js";

/** The batch, « la coupe en série » (step 2 of docs/recherche/feuille-de-route.md, Sami, 26/10/2026, the evening). */
const batched = (id, batch, banquet = BANQUET) => ({ ...KITCHENS[id], banquet: { ...banquet, batch } });

/** Every dish in a batch follows a leader of its course still being made. */
function followersHold(state, id) {
  for (const follower of state.upcoming.filter((order) => order.status === "batched")) {
    const leader = state.upcoming.find((order) => order.id === follower.batchOf);
    assert.ok(leader && leader.table === follower.table && leader.recipe === follower.recipe, `${id} : un lot d'un même envoi`);
    assert.ok(!["open", "passed", "served"].includes(leader.status), `${id} : le meneur est en cours`);
  }
}

/** A batch's followers reached the pass the turn its leader did (unless the leader burnt, and they were released). */
function passedTogether(state, event) {
  const leaderPassed = state.log.find((one) => one.type === "passed" && one.order === event.order);
  if (!leaderPassed) return;
  for (const id of event.orders) assert.ok(state.log.some((one) => one.type === "passed" && one.order === id && one.t === leaderPassed.t));
}

describe("the batch at a banquet (src/service-batch.js)", () => {
  it("makes dishes of a course together: one leader, its followers never offered to others, at the pass with it", () => {
    for (const id of ["petite", "postes", "brigade"]) {
      const setup = batched(id, 3);
      const state = createService(setup, drawOrders(1, setup), { human: "urgent", seed: 1 });
      while (!isOver(state)) {
        stepService(state, RULES.retro, HUMANS.urgent);
        followersHold(state, id);
      }
      const batches = state.log.filter((event) => event.type === "batch");
      assert.ok(batches.length > 0 && batches.every((event) => event.orders.length <= 2));
      for (const event of batches) passedTogether(state, event);
    }
  });

  it("cuts longer for each portion more, and takes an ingredient for each", () => {
    const setup = { ...batched("postes", 3), supply: { o: 20, t: 20 } };
    const state = createService(setup, drawOrders(2, setup), { human: "urgent", seed: 2 });
    while (!state.log.some((event) => event.type === "batch")) stepService(state, RULES.retro, HUMANS.urgent);
    const event = state.log.find((one) => one.type === "batch");
    const cook = state.cooks.find((one) => one.id === event.cook);
    const cut = cook.steps.find((step) => step.type === "cut");
    const base = state.upcoming.find((order) => order.id === event.order).recipe === "soupe" ? 3 : 4;
    assert.equal(cut.turns, base + event.orders.length * BANQUET.extra);
    const used = 40 - state.supply.o - state.supply.t;
    assert.ok(used >= 1 + event.orders.length);
  });

  it("brings back the banquet that failed: eight guests, thirty turns warm, sent with a batch a course", () => {
    const hard = { ...BANQUET, covers: 8, pass: 30 };
    const alone = runService(batched("detour", 1, hard), 1, RULES.retro, HUMANS.urgent).measures;
    const whole = runService(batched("detour", 99, hard), 1, RULES.retro, HUMANS.urgent).measures;
    assert.equal(alone.onTime, 0);
    assert.ok(whole.onTime > 0 && whole.tablesOnTime > 0);
  });

  it("is off by default", () => {
    assert.equal(BANQUET.batch, 1);
    const { state } = runService({ ...KITCHENS.petite, banquet: BANQUET }, 1, RULES.retro, HUMANS.urgent);
    assert.ok(!state.log.some((event) => event.type === "batch"));
  });
});
