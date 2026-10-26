import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { searchRule } from "../src/search.js";
import { useSupply } from "../src/service-supply.js";
import { TABLES } from "../src/service-tables.js";
import { cloneService, createService, drawOrders, isOver, runService, stepService } from "../src/simulate.js";

/** The rupture, « le 86 » (step 1 of docs/recherche/feuille-de-route.md, Sami's choice of 26/10/2026: the orders are refused). */
const scarce = (id, supply = { o: 3, t: 3 }) => ({ ...KITCHENS[id], supply });

/** The dishes started from their crate in a service, by ingredient: the orders gone from open to taken, their cook off to the crate. */
function started(setup, seed, rule) {
  const state = createService(setup, drawOrders(seed, setup), { human: "urgent", seed });
  const counts = { o: 0, t: 0 };
  while (!isOver(state)) {
    const open = new Set(state.upcoming.filter((order) => order.status === "open").map((order) => order.id));
    stepService(state, rule, HUMANS.urgent);
    for (const cook of state.cooks) countStart(state, cook, open, counts);
    assert.ok(state.supply.o >= 0 && state.supply.t >= 0);
  }
  return counts;
}

/** `cook` has just taken an order that was open, and goes to its crate: one dish started. */
function countStart(state, cook, open, counts) {
  const order = state.upcoming.find((one) => one.id === cook.order);
  if (order && open.has(order.id) && cook.steps?.[0].type === "fetch") counts[order.recipe === "soupe" ? "o" : "t"] += 1;
}

describe("the rupture (src/service-supply.js)", () => {
  it("refuses a dish's orders once its crate is empty, and counts them apart", () => {
    for (const id of ["petite", "postes", "detour"]) {
      const { state, measures } = runService(scarce(id), 1, RULES.quickest, HUMANS.urgent);
      assert.ok(measures.refused > 0, id);
      assert.equal(measures.onTime + measures.late + measures.missed + measures.refused, measures.orders, id);
      assert.deepEqual(state.supply, { o: 0, t: 0 }, id);
      const outAt = measures.outAt;
      for (const event of state.log.filter((one) => one.type === "refused")) {
        const order = state.upcoming.find((one) => one.id === event.order);
        assert.ok(event.t >= outAt[order.recipe === "soupe" ? "o" : "t"], `${id} : refusée après la rupture`);
      }
    }
  });

  it("never starts more dishes from a crate than it holds", () => {
    const counts = started(scarce("brigade", { o: 4, t: 2 }), 2, RULES.oldest);
    assert.ok(counts.o <= 4 && counts.t <= 2, JSON.stringify(counts));
  });

  it("gives the search's worlds their own count: drawing from a copy leaves the service's crates as they were", () => {
    const setup = scarce("petite");
    const state = createService(setup, drawOrders(1, setup), { seed: 1 });
    const world = cloneService(state);
    useSupply(world, "soupe");
    assert.deepEqual(state.supply, { o: 3, t: 3 });
    assert.equal(world.supply.o, 2);
    const { measures } = runService(setup, 1, searchRule({ budget: 8 }), HUMANS.urgent);
    assert.ok(measures.refused > 0);
  });

  it("sends a table without its refused dish", () => {
    const { state, measures } = runService({ ...scarce("brigade", { o: 2, t: 6 }), tables: TABLES }, 3, RULES.table, HUMANS.urgent);
    const sent = state.log.filter((event) => event.type === "sent");
    const partial = sent.filter((event) => state.upcoming.some((order) => order.table === event.table && order.status === "refused"));
    assert.ok(measures.refused > 0 && partial.length > 0, "une table partie sans son plat refusé");
  });

  it("is off by default: no refused orders, no rupture's measures", () => {
    assert.equal("refused" in runService(KITCHENS.petite, 1, RULES.quickest, HUMANS.urgent).measures, false);
  });
});
