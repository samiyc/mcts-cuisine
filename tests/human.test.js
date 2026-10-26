import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createRng } from "mcts-commun/random.js";
import { KITCHENS } from "../src/kitchens.js";
import { HUMANS, RULES } from "../src/rules.js";
import { drawWorld } from "../src/search.js";
import { BREAKDOWNS } from "../src/service-breakdowns.js";
import { ERRORS, FATIGUE, PAUSES } from "../src/service-human.js";
import { createService, drawOrders, isOver, runService, stepService } from "../src/simulate.js";

/** The human's pauses, fatigue and errors, and the robots' breakdowns (Sami, 26/10/2026, the evening). */
const play = (setup, seed, each) => {
  const state = createService(setup, drawOrders(seed, setup), { human: "urgent", seed });
  while (!isOver(state)) {
    stepService(state, RULES.quickest, HUMANS.urgent);
    each?.(state);
  }
  return state;
};
const humanOf = (state) => state.cooks.find((cook) => cook.kind === "human");

describe("the human's limits (src/service-human.js)", () => {
  it("pauses once he is free, for the pause's length, and does nothing meanwhile", () => {
    let paused = 0;
    const state = play({ ...KITCHENS.petite, pauses: PAUSES }, 1, (now) => {
      const human = humanOf(now);
      if (human.phase !== "pause") return;
      paused += 1;
      assert.equal(human.order, null, "il a fini son plat d'abord");
    });
    const event = state.log.find((one) => one.type === "pause");
    assert.ok(event && event.t >= PAUSES.from && event.turns === PAUSES.length);
    assert.equal(paused, PAUSES.length);
  });

  it("works slower once tired", () => {
    const spans = [];
    play({ ...KITCHENS.petite, fatigue: { ...FATIGUE, slower: 1 } }, 1, (now) => {
      const human = humanOf(now);
      if (human.phase === "working" && human.steps?.[human.step]?.type === "cut") spans.push([now.t, human.span]);
    });
    assert.ok(spans.some(([t, span]) => t > FATIGUE.after + 1 && span >= 6), "une coupe deux fois plus longue");
    assert.ok(spans.some(([t, span]) => t < FATIGUE.after && span <= 4));
  });

  it("gets a dish wrong now and then: the order is made again", () => {
    const state = play({ ...KITCHENS.petite, errors: { rate: 0.5, tired: 0.5 } }, 1);
    const wrong = state.log.filter((event) => event.type === "wrong");
    assert.ok(wrong.length > 0);
    assert.ok(wrong.every((event) => state.upcoming.find((order) => order.id === event.order).wrong >= 1));
    assert.ok(runService({ ...KITCHENS.petite, errors: ERRORS }, 1, RULES.quickest, HUMANS.urgent).measures.remade >= 0);
  });
});

describe("the robots' breakdowns (src/service-breakdowns.js)", () => {
  it("stops a robot where it is for the repair, its gesture waiting", () => {
    const setup = { ...KITCHENS.brigade, breakdowns: { ...BREAKDOWNS, every: 100 } };
    const stopped = new Map();
    const state = play(setup, 1, (now) => {
      for (const cook of now.cooks.filter((one) => (one.brokenUntil ?? 0) > now.t)) {
        const at = stopped.get(cook.id);
        if (at && at.until === cook.brokenUntil) assert.deepEqual([cook.x, cook.y], at.cell, "il ne bouge pas");
        else stopped.set(cook.id, { until: cook.brokenUntil, cell: [cook.x, cook.y] });
      }
    });
    assert.ok(state.log.filter((event) => event.type === "broken").length >= 2);
  });

  it("hides the pauses and breakdowns to come from the search: its worlds draw them again", () => {
    const setup = { ...KITCHENS.brigade, pauses: { ...PAUSES, count: 2 }, breakdowns: { ...BREAKDOWNS, every: 100 } };
    const state = createService(setup, drawOrders(1, setup), { human: "urgent", seed: 1 });
    stepService(state, RULES.quickest, HUMANS.urgent);
    const worlds = [1, 2, 3, 4].map((seed) => drawWorld(state, createRng(seed)));
    assert.ok(worlds.some((world) => JSON.stringify(world.breakdowns.next) !== JSON.stringify(state.breakdowns.next)));
    assert.ok(worlds.some((world) => JSON.stringify(world.person.pauses) !== JSON.stringify(state.person.pauses)));
  });

  it("is off by default", () => {
    const { measures } = runService(KITCHENS.brigade, 1, RULES.quickest, HUMANS.urgent);
    assert.equal("breakdowns" in measures || "remade" in measures, false);
  });
});
