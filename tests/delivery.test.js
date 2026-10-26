import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRng } from "mcts-commun/random.js";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { drawWorld, searchRule } from "../src/search.js";
import { DELIVERY } from "../src/service-delivery.js";
import { createService, drawOrders, isOver, runService, stepService } from "../src/simulate.js";

/** Delivery (step 3 of docs/recherche/feuille-de-route.md, 26/10/2026): a courier for each order, his turn hidden. */
const delivering = (id) => ({ ...KITCHENS[id], delivery: DELIVERY });

describe("delivery (src/service-delivery.js)", () => {
  it("gives each order its courier: announced after the order's preparation, coming a few turns either way", () => {
    const plain = drawOrders(3, KITCHENS.petite);
    const orders = drawOrders(3, delivering("petite"));
    assert.deepEqual(orders.map((order) => [order.id, order.recipe, order.arrival]), plain.map((order) => [order.id, order.recipe, order.arrival]));
    for (const order of orders) {
      assert.equal(order.sendAt, order.arrival + DELIVERY.prep);
      assert.ok(Math.abs(order.courierAt - order.sendAt) <= DELIVERY.spread);
      assert.equal(order.deadline, order.courierAt + DELIVERY.wait);
    }
  });

  it("sends a dish when its courier is there, and lets the courier leave without it after his wait, nothing of it left behind", () => {
    for (const id of ["petite", "brigade", "detour"]) {
      const setup = delivering(id);
      const state = createService(setup, drawOrders(2, setup), { human: "urgent", seed: 2 });
      while (!isOver(state)) {
        stepService(state, RULES.quickest, HUMANS.urgent);
        for (const order of state.upcoming.filter((one) => one.status === "gone")) {
          assert.ok(!state.cooks.some((cook) => cook.order === order.id), `${id} : personne ne fait un plat parti`);
          assert.ok(![...state.pots.values()].some((pot) => pot.order === order.id) && ![...state.shelf.values()].includes(order.id));
        }
      }
      for (const order of state.upcoming.filter((one) => one.status === "served")) {
        assert.ok(order.servedAt >= order.courierAt && order.servedAt <= order.deadline, `${id} : envoyé quand le coursier est là`);
      }
      assert.ok(state.log.filter((event) => event.type === "gone").every((event) => !state.log.some((one) => one.type === "sent" && one.orders.includes(event.order) && one.t > event.t)), `${id} : rien n'est envoyé à un coursier reparti`);
    }
  });

  it("hides the couriers from the search: its worlds draw again when those not yet come will come", () => {
    const setup = delivering("petite");
    const state = createService(setup, drawOrders(1, setup), { human: "urgent", seed: 1 });
    while (state.t < 40) stepService(state, RULES.quickest, HUMANS.urgent);
    const waiting = state.upcoming.filter((order) => order.arrival <= state.t && order.courierAt > state.t);
    assert.ok(waiting.length > 0);
    const worlds = [1, 2, 3, 4, 5].map((seed) => drawWorld(state, createRng(seed)));
    const courierIn = (world, id) => world.upcoming.find((one) => one.id === id)?.courierAt;
    const redrawn = waiting.some((order) => worlds.some((world) => courierIn(world, order.id) !== order.courierAt));
    assert.ok(redrawn, "l'heure réelle d'un coursier n'est pas connue des mondes");
    // A courier already come keeps his turn: that one is known.
    const kept = (world) => world.upcoming.every((order) => order.courierAt === undefined || order.courierAt > state.t || courierIn(state, order.id) === order.courierAt);
    assert.ok(worlds.every(kept));
    const { measures } = runService(setup, 1, searchRule({ budget: 8 }), HUMANS.urgent);
    assert.ok(measures.orders > 0 && measures.gone >= 0 && measures.maxCourierWait <= DELIVERY.wait);
  });

  it("is off by default", () => {
    assert.equal("gone" in runService(KITCHENS.petite, 1, RULES.quickest, HUMANS.urgent).measures, false);
  });
});
