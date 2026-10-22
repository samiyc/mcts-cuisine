import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { createService, drawOrders, isOver, measuresOf, stepService } from "../src/simulate.js";
import { cellsOf, cooksOf, ordersOf, statusLine } from "../web/view.js";

const setup = KITCHENS.petite;

describe("what the page shows (web/view.js)", () => {
  it("draws every cell, the stations by their letter", () => {
    const service = createService(setup, drawOrders(1, setup), { seed: 1 });
    const cells = cellsOf(service);
    assert.equal(cells.length, service.kitchen.plan.width * service.kitchen.plan.height);
    assert.deepEqual([...new Set(cells.map((cell) => cell.kind))].sort(), ["C", "P", "S", "counter", "floor", "o", "t"]);
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
    assert.match(statusLine(service, measuresOf(service)), /\d+ pas servies · \d+ tours en moyenne de la commande à la table$/);
    assert.ok(cellsOf(service).every((cell) => cell.progress === null || (cell.progress >= 0 && cell.progress <= 1)));
  });
});
