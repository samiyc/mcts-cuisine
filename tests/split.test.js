import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { createService, drawOrders, isOver, runService, stepService } from "../src/simulate.js";

/**
 * The split kitchen's blockage (Sami, 26/10/2026, the evening, a screenshot: the top stove burnt, and robot 1 no
 * longer handed its onions over through the counter): two faults, either one enough to stall a service.
 */
const step = (state) => stepService(state, RULES.quickest, HUMANS.urgent);

describe("the split kitchen (src/service-legs.js, src/service-basics.js)", () => {
  it("lets a soup burnt after a relay go through a counter again", () => {
    const setup = KITCHENS.separee;
    const state = createService(setup, drawOrders(1, setup), { human: "urgent", seed: 1 });
    while (state.pots.size === 0) step(state);
    const pot = [...state.pots.values()][0];
    const order = state.upcoming.find((one) => one.id === pot.order);
    assert.equal(order.relayed, true, "ses oignons sont passés par le comptoir");
    pot.ready = state.t - setup.unattended.burn;
    step(state);
    assert.equal(order.burnt, 1);
    while (!isOver(state) && order.status !== "served") step(state);
    assert.equal(order.status, "served", "refaite, elle repasse par le comptoir au lieu d'attendre un fourneau hors d'atteinte");
    assert.equal(state.log.filter((event) => event.type === "relay" && event.order === order.id).length, 2);
  });

  it("moves a robot watching its pot out of the way of the cook who comes to take it off", () => {
    // Before: the robot stood on the top stove's only side, and 1 to 3 soups burnt a service in these kitchens.
    for (const kitchen of ["separee", "postes"]) {
      for (const seed of [1, 2, 3]) assert.equal(runService(KITCHENS[kitchen], seed, RULES.quickest, HUMANS.urgent).measures.burnt, 0, `${kitchen}, service ${seed}`);
    }
  });
});
