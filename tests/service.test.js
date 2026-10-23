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
    assert.deepEqual(measuresOf(createService(KITCHENS.petite, [])), { orders: 0, onTime: 0, late: 0, missed: 0, meanServe: 0, moves: 0, waits: 0, burnt: 0 });
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
      const relays = state.log.filter((event) => event.type === "relay");
      assert.ok(put.length > 0);
      assert.ok(put.every((event) => event.cook === cutter || relays.some((relay) => relay.cook === event.cook && relay.order === event.order)), "seul le robot qui coupe pose, hors relais");
      // Every batch the cutter put down (not a relay) is a soup to cook.
      const relayed = (event) => relays.some((relay) => relay.cook === event.cook && relay.order === event.order);
      for (const event of put.filter((one) => !relayed(one))) assert.equal(state.upcoming.find((one) => one.id === event.order).recipe, "soupe");
    }
    assert.ok(fitsRole("coupe", { status: "open", recipe: "soupe" }) && !fitsRole("coupe", { status: "open", recipe: "salade" }));
    assert.ok(fitsRole("cuisson", { status: "prepped", recipe: "soupe" }) && fitsRole(null, { status: "open", recipe: "salade" }));
    // Without roles, the counters stay empty.
    const none = { ...KITCHENS.postes, roles: [] };
    assert.equal(runService(none, 1, RULES.quickest, HUMANS.urgent).state.log.filter((event) => event.type === "put").length, 0);
  });

  it("lets the soup cook alone: the pot is put on, taken off ready, or burns, the stove then cleaned", () => {
    const unattended = { burn: 6, clean: 5 };
    let burnt = 0;
    let served = 0;
    for (let seed = 1; seed <= 6; seed += 1) {
      const kitchen = { ...KITCHENS.petite, unattended };
      const state = createService(kitchen, drawOrders(seed, kitchen), { human: "urgent", seed });
      while (!isOver(state)) {
        stepService(state, RULES.quickest, HUMANS.urgent);
        // A pot holds its stove; a soup ready longer than `burn` turns has burnt, unless a cook is taking it off.
        for (const [stove, pot] of state.pots) {
          const order = state.upcoming.find((one) => one.id === pot.order);
          assert.equal(order.stove, stove);
          if (state.t < pot.ready) assert.equal(order.status, "cooking");
          else assert.ok(state.t <= pot.ready + unattended.burn || state.cooks.some((cook) => cook.order === order.id && cook.phase === "working"));
        }
        // Putting the pot on is one turn at the stove, 1 + clean on a burnt one.
        for (const cook of state.cooks) if (cook.phase === "working" && cook.steps[cook.step].type === "cook") assert.ok([1, 1 + unattended.clean].includes(cook.span));
      }
      assert.ok(state.log.some((one) => one.type === "pot"));
      burnt += measuresOf(state).burnt;
      served += measuresOf(state).onTime;
      // A burnt soup was made again from the start: its order went back to open.
      for (const event of state.log.filter((one) => one.type === "burnt")) assert.ok(state.log.some((one) => one.type === "taken" && one.order === event.order && one.t >= event.t) || state.upcoming.find((one) => one.id === event.order).status === "open");
    }
    assert.ok(served > 0);
    assert.ok(burnt < 6 * 3, "les cuisiniers surveillent leur marmite");
    // A soup that burns the turn it is ready: some do, and their stoves are cleaned before cooking again.
    const hasty = { ...KITCHENS.petite, unattended: { burn: 0, clean: 5 } };
    const { state, measures } = runService(hasty, 1, RULES.oldest, HUMANS.urgent);
    assert.ok(measures.burnt > 0, "une soupe laissée brûle");
    assert.ok(state.log.filter((one) => one.type === "burnt").every((event) => state.upcoming.find((one) => one.id === event.order).burnt > 0));
    // Without the option, no pot and no burnt measure: the kitchen plays as before.
    assert.equal("burnt" in runService({ ...KITCHENS.petite, unattended: null }, 1, RULES.quickest, HUMANS.urgent).measures, false);
  });

  it("relays dishes through the counters in a kitchen cut in two, and never takes back a dish it left", () => {
    let served = 0;
    for (let seed = 1; seed <= 4; seed += 1) {
      const kitchen = KITCHENS.separee;
      const state = createService(kitchen, drawOrders(seed, kitchen), { human: "urgent", seed });
      while (!isOver(state)) stepService(state, RULES.quickest, HUMANS.urgent);
      const relays = state.log.filter((event) => event.type === "relay");
      assert.ok(relays.length > 0, "des relais");
      for (const relay of relays) {
        // Up to a burn: a soup burnt is an order to make again, which anyone may take.
        const burnt = state.log.find((event) => event.type === "burnt" && event.order === relay.order && event.t >= relay.t)?.t ?? Infinity;
        const after = state.log.filter((event) => event.type === "taken" && event.order === relay.order && event.t >= relay.t && event.t < burnt);
        assert.ok(after.every((event) => event.cook !== relay.cook), `service ${seed} : le robot ${relay.cook} reprend la commande ${relay.order}`);
      }
      served += measuresOf(state).onTime;
    }
    assert.ok(served / 4 > 6, "la cuisine coupée en deux sert");
  });

  it("lets the chef make a batch ahead, taken over by the next order of that dish, and clean a burnt stove", () => {
    const kitchen = { ...KITCHENS.petite, unattended: { burn: 0, clean: 3 } };
    const state = createService(kitchen, [{ id: 1, recipe: "salade", arrival: 30, deadline: 90 }], { human: "clavier", manual: true, seed: 1 });
    const chef = state.cooks.find((cook) => cook.manual);
    const go = (dx, dy) => {
      steer(state, dx, dy);
      stepService(state, RULES.quickest, null);
    };
    // To the tomato crate (top row, x = 5): right once, up once.
    go(1, 0);
    go(0, -1);
    assert.deepEqual([chef.x, chef.y], [5, 1]);
    assert.match(interact(state), /en avance/);
    assert.ok(state.upcoming.some((order) => order.stock && order.cook === chef.id));
    while (state.t < 31) stepService(state, RULES.quickest, null);
    // The order has come: it took the batch over, in the chef's hands.
    assert.equal(chef.order, 1);
    assert.ok(!state.upcoming.some((order) => order.stock));
    // A burnt stove: E beside it, hands empty, cleans it.
    const burnt = createService(kitchen, [], { human: "clavier", manual: true, seed: 1 });
    const cleaner = burnt.cooks.find((cook) => cook.manual);
    burnt.dirty.add("10,3");
    burnt.reservations.release(cleaner.id);
    burnt.reservations.reserve(cleaner.id, [{ x: 9, y: 3, t: 0 }], { stay: true });
    Object.assign(cleaner, { x: 9, y: 3 });
    assert.match(interact(burnt), /récure le fourneau brûlé \(3 tours\)/);
    for (let i = 0; i < 4; i += 1) stepService(burnt, RULES.quickest, null);
    assert.ok(!burnt.dirty.has("10,3"));
    assert.equal(cleaner.phase, "idle");
  });

  it("has a cook far from a station give its place to one that would be done before it got there, and the human relay too", () => {
    let gave = 0;
    for (let seed = 1; seed <= 10; seed += 1) {
      const { state } = runService(KITCHENS.petite, seed, RULES.quickest, HUMANS.urgent);
      // Not in the last turns: the service may end before the one given the place does anything.
      for (const event of state.log.filter((one) => one.type === "gaveWay" && one.t < KITCHENS.petite.service - 5)) {
        gave += 1;
        // The one given the place set off at once for it.
        assert.ok(state.log.some((one) => one.t >= event.t && one.cook === event.to), `service ${seed}`);
      }
    }
    assert.ok(gave > 0, "des places rendues");
    const { state } = runService(KITCHENS.detour, 1, RULES.quickest, HUMANS.nearest, "nearest");
    const human = state.cooks.find((cook) => cook.kind === "human").id;
    assert.ok(state.log.some((event) => event.type === "relay" && event.cook === human), "le cuisinier pose pour le robot du passe");
  });

  it("leaves the keyboard chef his soup ready on the stove, unless it is about to burn, and gives it back to him", () => {
    const kitchen = { ...KITCHENS.petite, unattended: { burn: 12, clean: 5 } };
    const state = createService(kitchen, [{ id: 1, recipe: "soupe", arrival: 500, deadline: 590 }], { human: "clavier", manual: true, seed: 1 });
    const chef = state.cooks.find((cook) => cook.manual);
    stepService(state, RULES.quickest, null);
    // His soup ready on the right stove (10, 3), the chef beside it.
    const order = state.upcoming[0];
    assert.ok(state.cooks.every((cook) => cook.order === null));
    Object.assign(order, { status: "ready", cook: null, stove: "10,3", arrival: 0 });
    state.pots.set("10,3", { order: 1, ready: state.t, owner: chef.id });
    stepService(state, RULES.quickest, null);
    assert.equal(order.status, "ready", "les robots la laissent au chef");
    // A robot sets off for it all the same: the chef there takes it back.
    const robot = state.cooks.find((cook) => cook.kind === "robot");
    Object.assign(order, { status: "taken", cook: robot.id });
    Object.assign(robot, { order: 1, steps: [{ type: "collect", kind: "P", at: "10,3", turns: 1 }, { type: "serve", kind: "S", turns: 1 }], step: 0, phase: "moving" });
    state.reservations.release(chef.id);
    state.reservations.reserve(chef.id, [{ x: 9, y: 3, t: state.t }], { stay: true });
    Object.assign(chef, { x: 9, y: 3 });
    assert.match(interact(state), /le chef prend la soupe de la commande 1 sur le feu \(le robot \d y allait\)/);
    assert.equal(chef.order, 1);
    assert.equal(robot.order, null);
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
