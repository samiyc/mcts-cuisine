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
