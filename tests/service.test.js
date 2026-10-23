import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readKitchen } from "../src/kitchen.js";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES, compareRules } from "../src/rules.js";
import { createService, drawOrders, fitsRole, interact, isOver, measuresOf, runService, steer, stepService, stepsOf } from "../src/simulate.js";

/** Plays a service turn by turn, checking that no two cooks share a cell or swap, and no board or stove serves two. */
function playChecked(setup, seed, rule, humanName) {
  const human = HUMANS[humanName] ?? null;
  const state = createService(setup, drawOrders(seed, setup), { human: human ? humanName : null, seed });
  let before = state.cooks.map((cook) => ({ ...cook }));
  while (!isOver(state)) {
    stepService(state, rule, human);
    const cells = state.cooks.map((cook) => `${cook.x},${cook.y}`);
    assert.equal(new Set(cells).size, cells.length, `service ${seed}, tour ${state.t} : deux cuisiniers dans la même case`);
    assert.ok(state.cooks.every((cook) => state.kitchen.floor(state.kitchen.plan.at(cook.x, cook.y))));
    for (const a of state.cooks) {
      for (const b of state.cooks) {
        const was = (cook) => before.find((one) => one.id === cook.id);
        const swapped = a.id < b.id && a.x === was(b).x && a.y === was(b).y && b.x === was(a).x && b.y === was(a).y;
        assert.ok(!swapped, `service ${seed}, tour ${state.t} : ${a.id} et ${b.id} se croisent`);
      }
    }
    const busy = state.cooks.filter((cook) => cook.phase === "working" && ["C", "P"].includes(cook.station?.kind)).map((cook) => `${cook.station.x},${cook.station.y}`);
    assert.equal(new Set(busy).size, busy.length, `service ${seed}, tour ${state.t} : un poste pour deux`);
    before = state.cooks.map((cook) => ({ ...cook }));
  }
  return state;
}

describe("the kitchen (src/kitchen.js, src/simulate.js)", () => {
  it("reads a kitchen: its stations with the cells to work them from, the robots' and the human's places", () => {
    const kitchen = readKitchen(KITCHENS.petite.text);
    assert.equal(kitchen.robots.length, 2);
    assert.deepEqual(kitchen.human, { x: 4, y: 2 });
    const kinds = kitchen.stations.map((station) => station.kind).sort().join("");
    assert.equal(kinds, "CCPPSot");
    assert.ok(kitchen.stations.every((station) => station.access.length > 0));
    assert.throws(() => readKitchen("#o#\n#H#"), /il manque/);
  });

  it("draws the same orders from the same seed, each a chain of steps", () => {
    assert.deepEqual(drawOrders(4, KITCHENS.petite), drawOrders(4, KITCHENS.petite));
    assert.ok(drawOrders(4, KITCHENS.petite).every((order) => order.arrival <= KITCHENS.petite.lastOrder && order.deadline === order.arrival + KITCHENS.petite.patience));
    assert.deepEqual(stepsOf("soupe").map((step) => step.type), ["fetch", "cut", "cook", "serve"]);
    assert.deepEqual(stepsOf("salade").map((step) => step.type), ["fetch", "cut", "serve"]);
  });

  it("never puts two cooks in one cell, never lets them swap, never shares a board or a stove", () => {
    for (const setup of Object.values(KITCHENS)) {
      for (let seed = 1; seed <= 5; seed += 1) for (const humanName of ["urgent", "random", "none"]) playChecked(setup, seed, RULES.oldest, humanName);
    }
  });

  it("serves dishes through their steps, the same service from the same seed", () => {
    const { state, measures } = runService(KITCHENS.petite, 2, RULES.oldest, HUMANS.urgent);
    assert.ok(measures.onTime > 0);
    assert.equal(measures.onTime + measures.late + measures.missed, measures.orders);
    assert.ok(state.log.some((event) => event.type === "served"));
    assert.deepEqual(runService(KITCHENS.couloir, 3, RULES.quickest, HUMANS.random, "random").measures, runService(KITCHENS.couloir, 3, RULES.quickest, HUMANS.random, "random").measures);
    assert.deepEqual(measuresOf(createService(KITCHENS.petite, [])), { orders: 0, onTime: 0, late: 0, missed: 0, meanServe: 0, moves: 0, waits: 0 });
  });

  it("gives robots roles: the cutter puts cut onions on a counter, one batch a counter, and they are cooked and served", () => {
    for (let seed = 1; seed <= 5; seed += 1) {
      const kitchen = KITCHENS.postes;
      const state = createService(kitchen, drawOrders(seed, kitchen), { human: "urgent", seed });
      while (!isOver(state)) {
        stepService(state, RULES.quickest, HUMANS.urgent);
        const waiting = state.upcoming.filter((order) => order.counter);
        assert.equal(waiting.length, state.shelf.size);
        assert.equal(new Set(waiting.map((order) => order.counter)).size, waiting.length, `service ${seed}, tour ${state.t} : deux lots sur un comptoir`);
      }
      const cutter = state.cooks.find((cook) => cook.role === "coupe").id;
      const put = state.log.filter((event) => event.type === "put");
      assert.ok(put.length > 0);
      assert.ok(put.every((event) => event.cook === cutter), "seul le robot qui coupe pose");
      // Every batch put down and then served went through a stove: a soup.
      for (const { order } of put) assert.equal(state.upcoming.find((one) => one.id === order).recipe, "soupe");
    }
    assert.ok(fitsRole("coupe", { status: "open", recipe: "soupe" }) && !fitsRole("coupe", { status: "open", recipe: "salade" }));
    assert.ok(fitsRole("cuisson", { status: "prepped", recipe: "soupe" }) && fitsRole(null, { status: "open", recipe: "salade" }));
    // Without roles, the counters stay empty.
    const none = { ...KITCHENS.postes, roles: [] };
    assert.equal(runService(none, 1, RULES.quickest, HUMANS.urgent).state.log.filter((event) => event.type === "put").length, 0);
  });

  it("lets a person play the chef: moves, takes an order at a crate, cuts it, and the robots plan around him", () => {
    const kitchen = KITCHENS.petite;
    const state = createService(kitchen, drawOrders(2, kitchen), { human: "clavier", manual: true, seed: 2 });
    const chef = state.cooks.find((cook) => cook.manual);
    assert.match(interact(state), /aucun poste à portée/);
    // Walk to the onion crate (top row, x = 2): left twice, up once.
    const go = (dx, dy) => {
      steer(state, dx, dy);
      stepService(state, RULES.quickest, null);
    };
    while (!state.upcoming.some((order) => order.status === "open" && order.recipe === "soupe")) stepService(state, RULES.quickest, null);
    for (let i = 0; i < 2; i += 1) go(-1, 0);
    go(0, -1);
    assert.deepEqual([chef.x, chef.y], [2, 1]);
    assert.match(interact(state), /le chef prend la commande \d+ \(soupe à l'oignon\)/);
    const order = state.upcoming.find((one) => one.id === chef.order);
    assert.equal(order.status, "taken");
    // A turn of work, ended at the start of the next turn, as for any cook.
    stepService(state, RULES.quickest, null);
    stepService(state, RULES.quickest, null);
    assert.equal(chef.step, 1, "l'oignon pris");
    assert.match(steer(state, 0, -1), /mur ou un poste/);
    // The chef never shares a cell with a robot.
    for (let i = 0; i < 20; i += 1) {
      go(i % 2 ? 1 : -1, 0);
      assert.ok(state.cooks.every((cook) => cook === chef || cook.x !== chef.x || cook.y !== chef.y));
    }
  });

  it("compares the robots' rules by pairs on the same services", () => {
    const result = compareRules(KITCHENS.petite, { services: 20, humanName: "urgent" });
    assert.deepEqual(Object.keys(result), ["oldest", "quickest"]);
    assert.equal(result.oldest.gain.mean, 0);
    assert.equal(result.quickest.gain.n, 20);
  });
});
