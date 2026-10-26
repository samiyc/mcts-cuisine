import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { callForDishes, toldBy } from "../src/service-aboyeur.js";
import { MISE, goOn } from "../src/service-mise.js";
import { TABLES } from "../src/service-tables.js";
import { createService, drawOrders, isOver, runService, stepService } from "../src/simulate.js";

/** The aboyeur and the mise en place (step 1 of docs/recherche/feuille-de-route.md, Sami, 26/10/2026, the evening). */
const robot = { id: 1, kind: "robot", role: null };
const aboyeur = { id: 2, kind: "robot", role: "aboyeur" };

describe("the aboyeur (src/service-aboyeur.js)", () => {
  it("tells the robots the dishes he fired, and calls first for the one whose table-mates wait at the pass", () => {
    const soup = { id: 1, recipe: "soupe", arrival: 5, deadline: 65, table: 1, status: "open" };
    const salad = { id: 2, recipe: "salade", arrival: 5, deadline: 65, table: 1, status: "open" };
    const other = { id: 3, recipe: "salade", arrival: 6, deadline: 66, table: 2, status: "open" };
    const state = { t: 10, setup: { tables: TABLES }, upcoming: [soup, salad, other], cooks: [robot, aboyeur], pots: new Map(), log: [] };
    // The salad would wait for its soup: not fired yet; the human is not told anything.
    assert.deepEqual(toldBy(state, robot, [soup, salad, other]), [soup, other]);
    assert.deepEqual(toldBy(state, { id: 3, kind: "human" }, [soup, salad, other]), [soup, salad, other]);
    // The soup at the pass: the salad is called for, and only it.
    Object.assign(soup, { status: "passed", passedAt: 12 });
    state.t = 13;
    callForDishes(state);
    assert.equal(salad.called, 12);
    assert.deepEqual(state.log, [{ t: 13, type: "called", order: 2 }]);
    assert.deepEqual(toldBy(state, robot, [salad, other]), [salad]);
    callForDishes(state);
    assert.equal(state.log.length, 1, "réclamé une seule fois");
    // Without an aboyeur, nobody is told.
    assert.deepEqual(toldBy({ ...state, cooks: [robot] }, robot, [salad, other]), [salad, other]);
  });

  it("holds the pass: he never fetches nor cuts, the others make the dishes", () => {
    const setup = { ...KITCHENS.brigade, tables: TABLES, roles: [null, null, null, "aboyeur"] };
    const state = createService(setup, drawOrders(1, setup), { human: "urgent", seed: 1 });
    const him = state.cooks.find((cook) => cook.role === "aboyeur");
    while (!isOver(state)) {
      stepService(state, RULES.quickest, HUMANS.urgent);
      assert.ok(!him.steps?.some((step) => step.type === "fetch" || step.type === "cut"));
    }
    assert.ok(state.log.some((event) => event.type === "called"));
    assert.ok(state.log.some((event) => event.type === "sent"));
  });

  it("is in no kitchen by default", () => {
    assert.ok(!runService(KITCHENS.brigade, 1, RULES.quickest, HUMANS.urgent).state.log.some((event) => event.type === "called"));
  });
});

describe("the mise en place (src/service-mise.js)", () => {
  it("has free robots cut soups ahead, two waiting at most, that the next soups take over", () => {
    const setup = { ...KITCHENS.separee, miseEnPlace: MISE };
    const state = createService(setup, drawOrders(1, setup), { human: "urgent", seed: 1 });
    while (!isOver(state)) {
      stepService(state, RULES.quickest, HUMANS.urgent);
      const batches = state.upcoming.filter((order) => order.stock);
      assert.ok(batches.length <= MISE.ahead);
      assert.ok(batches.every((order) => order.recipe === "soupe"));
    }
    const { measures } = runService(setup, 1, RULES.quickest, HUMANS.urgent);
    assert.ok(measures.ahead > 0 && measures.aheadUsed > 0);
    assert.equal(measures.ahead, measures.aheadUsed + measures.aheadLeft);
  });

  it("goes on with a batch taken over in hand: cooked and served instead of put down", () => {
    const cook = { id: 1, order: 4, step: 1, steps: [{ type: "fetch" }, { type: "cut" }, { type: "put" }] };
    goOn({ cooks: [cook] }, { id: 4, recipe: "soupe" });
    assert.deepEqual(cook.steps.map((step) => step.type), ["fetch", "cut", "cook", "serve"]);
    const putting = { id: 1, order: 4, step: 2, steps: [{ type: "fetch" }, { type: "cut" }, { type: "put" }] };
    goOn({ cooks: [putting] }, { id: 4, recipe: "soupe" });
    assert.deepEqual(putting.steps.map((step) => step.type), ["fetch", "cut", "put"], "déjà en train de poser");
  });

  it("is off by default, and needs a counter to put a batch on", () => {
    assert.equal("ahead" in runService(KITCHENS.separee, 1, RULES.quickest, HUMANS.urgent).measures, false);
    assert.equal(runService({ ...KITCHENS.petite, miseEnPlace: MISE }, 1, RULES.quickest, HUMANS.urgent).measures.ahead, 0);
  });
});
