import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { createRng } from "mcts-commun/random.js";
import { drawWorld, searchRule, SEARCH_SETTINGS } from "../src/search.js";
import { BANQUET } from "../src/service-banquet.js";
import { createService, drawOrders, runService } from "../src/simulate.js";

/** The banquet (step 2 of docs/recherche/feuille-de-route.md, 26/10/2026): known orders, courses sent at their turn. */
const banquet = (id) => ({ ...KITCHENS[id], banquet: BANQUET });

describe("the banquet (src/service-banquet.js)", () => {
  it("knows every order from the start: a course a table, as many dishes as guests, sent at a turn drawn near its own", () => {
    for (const seed of [1, 2, 3]) {
      const orders = drawOrders(seed, banquet("petite"));
      const courses = BANQUET.courses.map((course, i) => orders.filter((order) => order.table === i + 1));
      assert.equal(courses[0].length, courses[1].length);
      assert.ok(courses[0].length >= BANQUET.covers - 1 && courses[0].length <= BANQUET.covers + 1);
      courses.forEach((dishes, i) => {
        assert.ok(dishes.every((order) => order.recipe === BANQUET.courses[i].recipe && order.arrival === 0 && order.sendAt === dishes[0].sendAt));
        assert.ok(Math.abs(dishes[0].sendAt - BANQUET.courses[i].at) <= BANQUET.spread);
        assert.equal(dishes[0].deadline, dishes[0].sendAt + BANQUET.slack);
      });
    }
  });

  it("sends a course whole, never before its turn, and loses a dish kept warm too long", () => {
    for (const id of ["petite", "brigade", "detour"]) {
      const { state, measures } = runService(banquet(id), 2, RULES.retro, HUMANS.urgent);
      for (const event of state.log.filter((one) => one.type === "sent")) {
        const course = state.upcoming.filter((order) => order.table === event.table);
        assert.ok(event.t >= course[0].sendAt, `${id} : pas avant son heure`);
        assert.ok(course.every((order) => order.servedAt === event.t));
      }
      assert.ok(measures.maxPass <= BANQUET.pass + 1 && measures.maxSendLate >= 0, id);
    }
  });

  it("plans backwards: holds a dish that would wait warm too long, takes the one whose latest start is nearest", () => {
    const setup = banquet("petite");
    const salad = { id: 1, recipe: "salade", arrival: 0, deadline: 75, table: 1, sendAt: 70, status: "open" };
    const soup = { id: 2, recipe: "soupe", arrival: 0, deadline: 135, table: 2, sendAt: 130, status: "open" };
    // At turn 0 the soup would start 109 turns early (130 - 11 - 10): more than the 60 it can wait warm.
    assert.equal(RULES.retro([soup, salad], { state: { t: 0, setup } }), salad);
    assert.equal(RULES.retro([soup], { state: { t: 0, setup } }), undefined);
    assert.equal(RULES.retro([soup], { state: { t: 50, setup } }), soup);
  });

  it("is played by the search, which has no order to draw, only the human", () => {
    const { measures } = runService(banquet("petite"), 1, searchRule({ budget: 8 }), HUMANS.urgent);
    assert.equal(measures.tables, 2);
    assert.equal("maxSendLate" in runService(KITCHENS.petite, 1, RULES.quickest, HUMANS.urgent).measures, false);
  });
  it("lets the search see to the last course and wait, as the backward planning does (the night measures of 26/10)", () => {
    const setup = banquet("comptoirs");
    const state = createService(setup, drawOrders(1, setup), { human: "urgent", seed: 1 });
    const last = Math.max(...state.upcoming.map((order) => order.deadline));
    assert.equal(drawWorld(state, createRng(1)).until, last);
    assert.equal(drawWorld(createService(KITCHENS.comptoirs, drawOrders(1, KITCHENS.comptoirs), { human: "urgent", seed: 1 }), createRng(1)).until, SEARCH_SETTINGS.horizon);
    const rule = searchRule({ budget: 8 });
    let held = 0;
    const counting = (open, context) => {
      const order = rule(open, context);
      if (!order) held += 1;
      return order;
    };
    runService(setup, 1, counting, HUMANS.urgent);
    assert.ok(held > 0, "la recherche n'attend jamais");
  });
});
