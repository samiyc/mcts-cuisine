import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KITCHENS } from "../src/kitchens.js";
import { RULES } from "../src/rules.js";
import { REPLAY_FORMAT, anomaliesOf, playReplay, pressKey, replayOf } from "../src/replay.js";
import { beginTurn, createService, drawOrders, interact, isOver, measuresOf, stepService } from "../src/simulate.js";

describe("replays of the chef at the keyboard (src/replay.js)", () => {
  it("plays a service again from its keys: the same service, nothing wrong", () => {
    const setup = KITCHENS.detour;
    const state = createService(setup, drawOrders(3, setup), { human: null, seed: 3, manual: true });
    const keys = ["q", "q", "z", "e", "s", "e", "d", "d", "e"];
    const inputs = [];
    for (let i = 0; !isOver(state); i += 1) {
      // As the page plays it: the turn starts, then the chef's key.
      beginTurn(state, null);
      if (i % 3 === 0) {
        const key = keys[(i / 3) % keys.length];
        inputs.push({ t: state.t, key });
        pressKey(state, key);
      }
      stepService(state, RULES.quickest, null);
      assert.deepEqual(anomaliesOf(state), [], `tour ${state.t}`);
    }
    const replay = replayOf({ kitchenId: "detour", setup, seed: 3, rule: "quickest", inputs });
    assert.equal(replay.format, REPLAY_FORMAT);
    // Through JSON, as a downloaded file.
    const again = playReplay(JSON.parse(JSON.stringify(replay)));
    assert.deepEqual(measuresOf(again.state), measuresOf(state));
    assert.deepEqual(again.anomalies, []);
  });

  it("lets the chef take a soup up on the turn it is ready, and carry it on as soon as he has (Sami, 23/10: two turns lost)", () => {
    const kitchen = { ...KITCHENS.petite, unattended: { burn: 12, clean: 5 } };
    const state = createService(kitchen, [{ id: 1, recipe: "soupe", arrival: 0, deadline: 300 }], { human: null, manual: true, seed: 1 });
    const chef = state.cooks.find((cook) => cook.manual);
    stepService(state, RULES.quickest, null);
    const order = state.upcoming[0];
    const ready = state.t + 2;
    Object.assign(order, { status: "cooking", cook: null, stove: "10,3" });
    state.pots.set("10,3", { order: 1, ready, owner: chef.id });
    for (const cook of state.cooks) if (!cook.manual) cook.phase = "idle";
    Object.assign(chef, state.kitchen.stations.find((one) => one.x === 10 && one.y === 3).access[0]);
    const said = [];
    while (state.t <= ready + 1) {
      beginTurn(state, null);
      said.push([state.t, interact(state)]);
      stepService(state, RULES.quickest, null);
    }
    assert.match(said.find(([t]) => t === ready - 1)[1], /cuit encore/);
    assert.match(said.find(([t]) => t === ready)[1], /prend la soupe/);
    // Taking it up is one turn: the next turn he is on his way to the pass.
    assert.equal(chef.steps[chef.step].type, "serve");
    assert.equal(chef.phase, "next");
  });

  it("plays a replay of version 1 (the key before the turn) as it was played", () => {
    const setup = KITCHENS.detour;
    const state = createService(setup, drawOrders(3, setup), { human: null, seed: 3, manual: true });
    const inputs = [];
    for (let i = 0; !isOver(state); i += 1) {
      if (i % 2 === 0) {
        const key = ["q", "z", "e", "s", "d", "e"][(i / 2) % 6];
        inputs.push({ t: state.t, key });
        pressKey(state, key);
      }
      stepService(state, RULES.quickest, null);
    }
    const old = { ...replayOf({ kitchenId: "detour", setup, seed: 3, rule: "quickest", inputs }), format: "cuisine-replay/1" };
    assert.deepEqual(measuresOf(playReplay(old).state), measuresOf(state));
  });

  it("tells a cook still working past its gesture, and a station held by nobody working there", () => {
    const setup = KITCHENS.petite;
    const state = createService(setup, [], { human: null, seed: 1, manual: true });
    const robot = state.cooks[0];
    Object.assign(robot, { phase: "working", until: state.t - 1, station: state.kitchen.stations.find((station) => station.kind === "C") });
    state.claims.set("5,5", robot.id);
    const found = anomaliesOf(state);
    assert.ok(found.some((text) => /travaille encore/.test(text)));
    assert.ok(found.some((text) => /sans être à côté/.test(text)));
    assert.ok(found.some((text) => /pris par le robot 1, qui n'y travaille pas/.test(text)));
  });
});

describe("the gaps of the chef's choices (src/replay.js, gapsOf)", () => {
  it("tries every order the chef could have taken, his own among them, and counts what his choices cost", async () => {
    const { gapsOf } = await import("../src/replay.js");
    const setup = KITCHENS.petite;
    const state = createService(setup, drawOrders(1, setup), { human: null, seed: 1, manual: true });
    // The chef walks to the tomato crate (right once, up once) and takes the most urgent salad whenever one is open.
    const inputs = [];
    const press = (key) => {
      inputs.push({ t: state.t, key });
      pressKey(state, key);
    };
    press("d");
    stepService(state, RULES.quickest, null);
    press("z");
    stepService(state, RULES.quickest, null);
    while (state.t < 120) {
      if (state.upcoming.some((order) => order.status === "open" && order.recipe === "salade") && state.cooks.find((cook) => cook.manual).order === null) press("e");
      stepService(state, RULES.quickest, null);
    }
    const replay = replayOf({ kitchenId: "petite", setup, seed: 1, rule: "quickest", inputs });
    const { decisions, agreed, gap } = gapsOf(replay, { window: 30 });
    assert.ok(decisions.length > 0, "le chef a choisi");
    for (const decision of decisions) {
      assert.ok(decision.options.some((option) => option.id === decision.chosen));
      assert.ok(decision.gap >= 0);
      assert.equal(decision.options.find((option) => option.id === decision.best).value - decision.options.find((option) => option.id === decision.chosen).value, decision.gap);
    }
    assert.ok(agreed <= decisions.length && gap >= 0);
  });
});
