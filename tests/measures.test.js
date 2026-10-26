import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES, compareRules } from "../src/rules.js";
import { searchRule } from "../src/search.js";
import { SLICE, bottleneckOf } from "../src/service-measures.js";
import { cloneService, createService, drawOrders, isOver, measuresOf, runService, stepService } from "../src/simulate.js";

/** The restaurants' indicators (step 0 of docs/recherche/feuille-de-route.md): counted, deciding nothing. */
describe("the indicators of a service (src/service-measures.js)", () => {
  it("counts the ticket times, the rush and the stations' use, each in its range", () => {
    for (const id of Object.keys(KITCHENS)) {
      const { state, measures } = runService(KITCHENS[id], 1, RULES.quickest, HUMANS.urgent);
      const served = state.upcoming.filter((order) => order.status === "served");
      const times = served.map((order) => order.servedAt - order.arrival);
      assert.equal(measures.maxServe, Math.max(...times), id);
      assert.ok(measures.meanServe <= measures.p90Serve && measures.p90Serve <= measures.maxServe, id);
      assert.equal(times.filter((time) => time <= measures.p90Serve).length >= 0.9 * times.length, true, id);
      assert.equal(measures.maxLate, Math.max(0, ...served.map((order) => order.servedAt - order.deadline)), id);
      assert.ok(measures.peakOpen >= 1 && measures.peakAt >= 1 && measures.peakAt < KITCHENS[id].service, id);
      for (const key of ["useBoard", "useStove", "usePass"]) assert.ok(measures[key] > 0 && measures[key] <= 1, `${id} ${key}`);
      assert.equal("useCounter" in measures, KITCHENS[id].text.includes("_"), `${id} : un comptoir mesuré seulement s'il y en a`);
      assert.equal(state.tally.turns, KITCHENS[id].service, id);
      assert.ok(measures.servedByHuman <= served.length, id);
    }
  });

  it("finds the rush where the orders pile up: the most open at once, at the turn it says", () => {
    const setup = KITCHENS.petite;
    const state = createService(setup, drawOrders(2, setup), { seed: 2 });
    let most = 0;
    while (!isOver(state)) {
      stepService(state, RULES.oldest, HUMANS.urgent);
      // The orders open during the turn just played: come by its start, not served by its start.
      const t = state.t - 1;
      most = Math.max(most, state.upcoming.filter((order) => order.arrival <= t && (order.servedAt === null || order.servedAt > t)).length);
    }
    assert.equal(measuresOf(state).peakOpen, most);
  });

  it("leaves the search's worlds uncounted: the service's own counts are those of the same service under the rules' choices", () => {
    const setup = KITCHENS.petite;
    const state = createService(setup, drawOrders(1, setup), { seed: 1 });
    assert.equal(cloneService(state).tally, null);
    const { state: searched } = runService(setup, 1, searchRule({ budget: 8 }), HUMANS.urgent);
    assert.equal(searched.tally.turns, setup.service);
  });

  it("names the bottleneck in every comparison, the station kind most at work and the one waited for most", () => {
    const rows = compareRules(KITCHENS.petite, { services: 5, humanName: "urgent" });
    for (const row of Object.values(rows)) {
      const neck = bottleneckOf(row);
      assert.ok(["planche", "fourneau", "passe"].includes(neck.use.word));
      assert.ok(neck.use.share > 0 && neck.use.share <= 1);
      assert.ok(neck.wait.turns >= 0);
    }
  });
  it("counts each cook's dishes, the service's curve by slices, and the stations claimed with nobody at work", () => {
    for (const id of ["petite", "separee", "brigade"]) {
      const { state, measures } = runService(KITCHENS[id], 1, RULES.quickest, HUMANS.urgent);
      const sum = (values) => values.reduce((total, value) => total + value, 0);
      assert.equal(measures.servedByCook.length, state.cooks.length);
      assert.equal(sum(measures.servedByCook), state.log.filter((event) => event.type === "served" || event.type === "passed").length);
      assert.equal(measures.servedByCook[state.cooks.findIndex((cook) => cook.kind === "human")], measures.servedByHuman);
      assert.equal(measures.cameBySlice.length, Math.ceil(state.setup.service / SLICE));
      assert.equal(sum(measures.cameBySlice), measures.orders);
      assert.equal(sum(measures.servedBySlice), measures.onTime + measures.late);
      assert.ok(measures.idleStove >= 0 && measures.idleBoard >= 0);
    }
    // A station is at work or claimed idle, never both in a turn.
    const { state } = runService(KITCHENS.brigade, 1, RULES.quickest, HUMANS.urgent);
    assert.ok(state.tally.idle.size > 0);
    for (const [key, turns] of state.tally.idle) assert.ok(turns + (state.tally.busy.get(key) ?? 0) <= state.tally.turns);
  });
});
