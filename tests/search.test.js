import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRng } from "mcts-commun/random.js";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { drawWorld, searchRule, valueOf } from "../src/search.js";
import { advance, choose, createService, drawOrders, runService, stepService } from "../src/simulate.js";

describe("the search (src/search.js)", () => {
  it("draws a world from what the robots know, leaving the service untouched", () => {
    const setup = KITCHENS.brigade;
    const service = createService(setup, drawOrders(2, setup), { human: "urgent", seed: 2 });
    // Play the quickest rule up to a robot's choice with two open orders at least, a few turns in.
    let choice = advance(service, HUMANS.urgent);
    while (choice && (service.t < 10 || choice.open.length < 2)) {
      choose(service, choice, RULES.quickest(choice.open).id);
      choice = advance(service, HUMANS.urgent);
    }
    assert.ok(choice, "un choix à au moins deux commandes");
    const before = JSON.stringify({ cooks: service.cooks, upcoming: service.upcoming, cursor: service.cursor, rng: service.rng.getState() });
    const worlds = Array.from({ length: 20 }, (_, i) => drawWorld(service, createRng(i + 1)));
    assert.equal(JSON.stringify({ cooks: service.cooks, upcoming: service.upcoming, cursor: service.cursor, rng: service.rng.getState() }), before);
    const known = service.upcoming.filter((order) => order.arrival <= service.t).map((order) => order.id);
    for (const world of worlds) {
      // The orders come are kept as they are; those to come are drawn again, after now.
      assert.deepEqual(world.upcoming.filter((order) => order.arrival <= service.t).map((order) => order.id), known);
      assert.ok(world.upcoming.filter((order) => order.arrival > service.t).every((order) => order.status === "upcoming" && order.id > Math.max(...known)));
      assert.equal(world.choice.cook.id, choice.cook.id);
      assert.ok(valueOf(world) >= 0);
    }
    assert.ok(new Set(worlds.map((world) => world.humanRule)).size > 1, "le modèle de l'humain est tiré au sort");
  });

  it("plays the robots beside a chef at the keyboard, who has no model: the worlds draw one (Sami, 23/10: it crashed)", () => {
    const kitchen = KITCHENS.detour;
    const state = createService(kitchen, drawOrders(1, kitchen), { human: null, manual: true, seed: 1 });
    const world = drawWorld(state, createRng(1));
    assert.equal(typeof world.humanRule, "function");
    const rule = searchRule({ budget: 8 });
    for (let i = 0; i < 40; i += 1) stepService(state, rule, null);
    assert.ok(state.log.some((event) => event.type === "taken"));
  });

  it("plays a whole service as a rule, the same service twice", () => {
    const setup = KITCHENS.petite;
    const rule = searchRule({ budget: 12 });
    const { measures } = runService(setup, 3, rule, HUMANS.urgent);
    assert.ok(measures.onTime > 0);
    assert.deepEqual(runService(setup, 3, searchRule({ budget: 12 }), HUMANS.urgent).measures, measures);
    assert.ok(runService(setup, 3, searchRule({ budget: 12 }), null).measures.orders === measures.orders);
  });
});
