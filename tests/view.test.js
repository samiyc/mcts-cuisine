import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { createService, drawOrders, isOver, measuresOf, stepService } from "../src/simulate.js";
import { cellsOf, cooksOf, ordersOf, statusLine } from "../web/view.js";

const setup = KITCHENS.petite;

/** Each order shown with its age, its patience (none once served) and its dish. */
function assertOrders(service) {
  for (const order of ordersOf(service)) {
    assert.equal(order.age, service.t - service.upcoming.find((one) => one.id === order.id).arrival);
    assert.ok(order.served ? order.patience === null : order.patience >= 0 && order.patience <= 1);
    assert.ok(["🍲", "🥗"].includes(order.emoji));
  }
}

/** A gesture's progress: none, or between 0 and 1. */
const inUnit = (value) => value === null || (value >= 0 && value <= 1);

/** What a cell shows of a stove: its gesture's progress, a pot cooking or ready (with the turns before it burns), a stove to clean. */
function seeStove(cell, seen) {
  assert.ok(inUnit(cell.progress));
  const pot = cell.pot ?? {};
  if (pot.ready === false) seen.cooking = true;
  if (pot.ready) seen.ready ||= pot.left >= 0 && pot.left <= 2;
  if (cell.dirty) seen.dirty = true;
}

/** The stages of the onions in the cooks' hands of `service`, and what a counter holds: cut, or ready. */
function seeStages(service, stages) {
  for (const cook of cooksOf(service)) if (cook.holding === "soupe") stages.add(cook.stage);
  for (const cell of cellsOf(service)) if (cell.dish) assert.ok(["cut", "ready"].includes(cell.stage), "un plat sur un comptoir est coupé ou prêt");
}

describe("what the page shows (web/view.js)", () => {
  it("draws every cell, the stations by their letter", () => {
    const service = createService(setup, drawOrders(1, setup), { seed: 1 });
    const cells = cellsOf(service);
    assert.equal(cells.length, service.kitchen.plan.width * service.kitchen.plan.height);
    assert.deepEqual([...new Set(cells.map((cell) => cell.kind))].sort(), ["C", "P", "S", "floor", "o", "t", "wall"]);
  });

  it("tells the cooks, the orders and the service as it goes", () => {
    const service = createService(setup, drawOrders(1, setup), { seed: 1 });
    for (let i = 0; i < 30; i += 1) stepService(service, RULES.quickest, HUMANS.urgent);
    const cooks = cooksOf(service);
    assert.equal(cooks.length, 3);
    assert.equal(cooks.at(-1).kind, "human");
    assert.ok(cooks.every((cook) => /^(Robot \d|Le cuisinier) : /.test(cook.label)));
    const orders = ordersOf(service);
    assert.ok(orders.length > 0 && orders[0].id >= orders.at(-1).id);
    assert.match(statusLine(service), /^Tour 30 \/ 200 · \d+ commandes · \d+ servies à temps · \d+ en retard$/);
    while (!isOver(service)) stepService(service, RULES.quickest, HUMANS.urgent);
    assert.match(statusLine(service, measuresOf(service)), /(?<!\d)\d+ pas servies · \d+ tours en moyenne de la commande à la table$/);
    assert.ok(cellsOf(service).every((cell) => cell.progress === null || (cell.progress >= 0 && cell.progress <= 1)));
  });

  it("shows each order's dish, age and patience, and the dishes waiting on the counters", () => {
    const kitchen = KITCHENS.comptoirs;
    const service = createService(kitchen, drawOrders(2, kitchen), { seed: 2 });
    let seenOnCounter = false;
    while (!isOver(service)) {
      stepService(service, RULES.quickest, HUMANS.urgent);
      const counters = cellsOf(service).filter((cell) => cell.kind === "counter");
      assert.equal(counters.length, 2);
      if (counters.some((cell) => cell.dish)) seenOnCounter = true;
      assertOrders(service);
    }
    assert.ok(seenOnCounter, "un plat posé sur un comptoir");
    // Onions in hand: whole until cut, then cut (a knife on them), then the dish.
    const kitchenRoles = KITCHENS.postes;
    const roles = createService(kitchenRoles, drawOrders(1, kitchenRoles), { seed: 1 });
    const stages = new Set();
    while (!isOver(roles)) {
      stepService(roles, RULES.quickest, HUMANS.urgent);
      seeStages(roles, stages);
    }
    assert.deepEqual([...stages].sort(), ["cut", "ready", "whole"]);
  });

  it("shows the pots cooking alone, the soups ready with the turns before they burn, and the stoves to clean", () => {
    const kitchen = { ...KITCHENS.petite, unattended: { burn: 2, clean: 5 } };
    const service = createService(kitchen, drawOrders(1, kitchen), { seed: 1 });
    const seen = { cooking: false, ready: false, dirty: false };
    while (!isOver(service)) {
      stepService(service, RULES.oldest, HUMANS.urgent);
      for (const cell of cellsOf(service)) seeStove(cell, seen);
      for (const order of ordersOf(service)) if (service.upcoming.find((one) => one.id === order.id).status === "ready") assert.match(order.status, /^prête sur le feu, brûle dans \d+ tours/);
    }
    assert.deepEqual(seen, { cooking: true, ready: true, dirty: true });
    assert.match(statusLine(service), /(?<!\d)\d+ soupes? brûlées?/);
  });
});
