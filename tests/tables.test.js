import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KITCHENS } from "../src/kitchens.js";
import { createRng } from "mcts-commun/random.js";
import { HUMANS, RULES, humansOf } from "../src/rules.js";
import { drawWorld, searchRule } from "../src/search.js";
import { BANQUET } from "../src/service-banquet.js";
import { TABLES } from "../src/service-tables.js";
import { createService, drawOrders, runService } from "../src/simulate.js";

/** The tables and the pass (step 1 of docs/recherche/feuille-de-route.md, Sami's choices of 26/10/2026). */
const withTables = (id, tables = TABLES) => ({ ...KITCHENS[id], tables });

/** A table sent goes whole: every one of its dishes, served that turn. */
function assertWhole(state, event, id) {
  const table = state.upcoming.filter((order) => event.orders.includes(order.id));
  assert.ok(table.every((order) => order.servedAt === event.t && order.table === event.table), `${id} : la table part en entier`);
  assert.equal(table.length, state.upcoming.filter((order) => order.table === event.table).length);
}

/** Along the log: a dish dies the turn after its limit at the pass, a table goes whole. */
function assertPass(state, id) {
  const passed = new Map();
  for (const event of state.log) {
    if (event.type === "passed") passed.set(event.order, event.t);
    if (event.type === "died") assert.equal(event.t - passed.get(event.order), TABLES.pass + 1, `${id} : un plat meurt au tour d'après sa limite`);
    if (event.type === "sent") assertWhole(state, event, id);
  }
}

describe("the tables (src/service-tables.js)", () => {
  it("draws tables of two or three dishes, each with the table's number, arrival and deadline", () => {
    const setup = withTables("petite");
    const orders = drawOrders(4, setup);
    const tables = new Map();
    for (const order of orders) tables.set(order.table, [...(tables.get(order.table) ?? []), order]);
    assert.ok(tables.size > 3);
    for (const dishes of tables.values()) {
      assert.ok(dishes.length >= TABLES.min && dishes.length <= TABLES.max);
      assert.equal(new Set(dishes.map((order) => `${order.arrival},${order.deadline}`)).size, 1);
    }
    assert.deepEqual(orders.map((order) => order.id), orders.map((_, i) => i + 1));
  });

  it("sends a table when its last dish reaches the pass, and lets a dish die there after `pass` turns", () => {
    for (const id of ["petite", "brigade", "detour"]) {
      const { state, measures } = runService(withTables(id), 2, RULES.table, HUMANS.urgent);
      assertPass(state, id);
      assert.ok(measures.tablesOnTime <= measures.tables && measures.maxPass <= TABLES.pass + 1, id);
      assert.equal(measures.died, state.log.filter((event) => event.type === "died").length, id);
    }
  });

  it("fires the longest dish of the oldest table first, and holds a salad while its soup is far from done", () => {
    const soup = { id: 1, recipe: "soupe", arrival: 5, deadline: 65, table: 1, status: "open" };
    const salad = { id: 2, recipe: "salade", arrival: 5, deadline: 65, table: 1, status: "open" };
    const later = { id: 3, recipe: "soupe", arrival: 9, deadline: 69, table: 2, status: "open" };
    const state = { t: 10, upcoming: [soup, salad, later], cooks: [], pots: new Map() };
    assert.equal(RULES.table([salad, later, soup], { state }), soup);
    // The soup taken, eleven turns of work ahead: the salad (four) waits; another table's soup goes first.
    const taken = { ...soup, status: "taken" };
    const cook = { order: 1, step: 1, steps: [{ turns: 1 }, { turns: 3 }, { turns: 8 }] };
    const busy = { t: 10, upcoming: [taken, salad, later], cooks: [cook], pots: new Map() };
    assert.equal(RULES.table([salad, later], { state: busy }), later);
    assert.equal(RULES.table([salad], { state: busy }), undefined);
    // Its cutting done, the soup has eight turns left: the salad goes.
    assert.equal(RULES.table([salad], { state: { ...busy, cooks: [{ ...cook, step: 2 }] } }), salad);
  });

  it("is off by default: a kitchen without tables has no table measures, and the search plays with tables", () => {
    assert.equal("tables" in runService(KITCHENS.petite, 1, RULES.quickest, HUMANS.urgent).measures, false);
    const { measures } = runService(withTables("petite"), 1, searchRule({ budget: 8 }), HUMANS.urgent);
    assert.ok(measures.tables > 0 && measures.orders > 0);
  });
  it("has a cook who follows his table: the oldest table, its longest dish first; at a banquet, nothing that would die warm", () => {
    const soup = { id: 1, recipe: "soupe", arrival: 5, deadline: 65, table: 1, status: "open" };
    const salad = { id: 2, recipe: "salade", arrival: 5, deadline: 65, table: 1, status: "open" };
    const older = { id: 3, recipe: "salade", arrival: 2, deadline: 50, table: 2, status: "open" };
    const setup = withTables("petite");
    assert.equal(HUMANS.table([salad, soup], { state: { t: 10, setup } }), soup);
    assert.equal(HUMANS.table([older, salad, soup], { state: { t: 10, setup } }), soup, "la table 1, la plus ancienne");
    const banquet = { ...KITCHENS.petite, banquet: BANQUET };
    const late = { id: 4, recipe: "soupe", arrival: 0, deadline: 135, table: 2, sendAt: 130, status: "open" };
    assert.equal(HUMANS.table([late], { state: { t: 0, setup: banquet } }), undefined);
    assert.equal(HUMANS.table([late], { state: { t: 50, setup: banquet } }), late);
  });

  it("gives that cook only to the services with tables, and lets the search imagine him there", () => {
    assert.deepEqual(humansOf(KITCHENS.petite), ["nearest", "urgent", "random"]);
    assert.deepEqual(humansOf(withTables("petite")), ["nearest", "urgent", "random", "table"]);
    const state = createService(withTables("petite"), drawOrders(1, withTables("petite")), { human: "table", seed: 1 });
    const drawn = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((seed) => drawWorld(state, createRng(seed)).humanRule));
    assert.ok(drawn.has(HUMANS.table));
    assert.ok(runService(withTables("petite"), 1, RULES.table, HUMANS.table).measures.tables > 0);
  });
});
