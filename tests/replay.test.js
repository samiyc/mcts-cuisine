import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KITCHENS } from "../src/kitchens.js";
import { RULES } from "../src/rules.js";
import { REPLAY_FORMAT, anomaliesOf, playReplay, pressKey, replayOf } from "../src/replay.js";
import { createService, drawOrders, isOver, measuresOf, stepService } from "../src/simulate.js";

describe("replays of the chef at the keyboard (src/replay.js)", () => {
  it("plays a service again from its keys: the same service, nothing wrong", () => {
    const setup = KITCHENS.detour;
    const state = createService(setup, drawOrders(3, setup), { human: null, seed: 3, manual: true });
    const keys = ["q", "q", "z", "e", "s", "e", "d", "d", "e"];
    const inputs = [];
    for (let i = 0; !isOver(state); i += 1) {
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
