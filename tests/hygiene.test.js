import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRng } from "mcts-commun/random.js";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { drawWorld } from "../src/search.js";
import { HYGIENE, boardCleaning, useBoard } from "../src/service-hygiene.js";
import { createService, drawOrders, runService, stepService } from "../src/simulate.js";

/** Hygiene and allergens (Sami, 26/10/2026, the evening). */
const clean = (id, hygiene = HYGIENE) => ({ ...KITCHENS[id], hygiene });

describe("hygiene and allergens (src/service-hygiene.js)", () => {
  it("flags a share of the salads « sans oignon », the orders themselves unchanged", () => {
    const plain = drawOrders(3, KITCHENS.brigade);
    const orders = drawOrders(3, clean("brigade", { ...HYGIENE, share: 0.5 }));
    assert.deepEqual(orders.map(({ allergen: _allergen, ...order }) => order), plain);
    const flagged = orders.filter((order) => order.allergen);
    assert.ok(flagged.length > 0 && flagged.every((order) => order.recipe === "salade" && order.allergen === "o"));
  });

  it("cleans a board that last cut onions before an allergic guest's salad, and not before another dish", () => {
    const board = { x: 0, y: 3, kind: "C" };
    const soup = { id: 1, recipe: "soupe" };
    const salad = { id: 2, recipe: "salade", allergen: "o" };
    const other = { id: 3, recipe: "salade" };
    const state = { t: 5, setup: { hygiene: HYGIENE }, boards: new Map(), upcoming: [soup, salad, other], log: [] };
    const cook = (order) => ({ id: 9, order: order.id });
    assert.equal(boardCleaning(state, board, cook(salad)), 0, "une planche neuve est propre");
    useBoard(state, board, cook(soup));
    assert.equal(boardCleaning(state, board, cook(other)), 0);
    assert.equal(boardCleaning(state, board, cook(salad)), HYGIENE.clean);
    useBoard(state, board, cook(salad));
    assert.deepEqual(state.log, [{ t: 5, type: "board", cook: 9, order: 2 }]);
    assert.equal(boardCleaning(state, board, cook(salad)), 0, "elle a coupé des tomates depuis");
    const { measures } = runService(clean("petite", { ...HYGIENE, share: 0.6 }), 2, RULES.quickest, HUMANS.urgent);
    assert.ok(measures.allergenOrders > 0);
  });

  it("cleans a board on the cleaning round, every so many cuts", () => {
    const { measures } = runService(clean("brigade", { ...HYGIENE, every: 4 }), 1, RULES.quickest, HUMANS.urgent);
    assert.ok(measures.boardsCleaned >= 3);
  });

  it("draws allergic guests in the search's worlds too, and is off by default", () => {
    const setup = clean("brigade", { ...HYGIENE, share: 0.5 });
    const state = createService(setup, drawOrders(1, setup), { human: "urgent", seed: 1 });
    while (state.t < 20) stepService(state, RULES.quickest, HUMANS.urgent);
    const world = drawWorld(state, createRng(3));
    assert.ok(world.upcoming.some((order) => order.arrival > state.t && order.allergen));
    assert.equal("boardsCleaned" in runService(KITCHENS.brigade, 1, RULES.quickest, HUMANS.urgent).measures, false);
  });
});
