import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { turnKeys } from "../web/keys.js";

/** The keys a turn plays (web/keys.js, Sami 23/10 and 26/10/2026: as many steps as the pace, or an E alone). */
describe("the chef's keys a turn plays (web/keys.js turnKeys)", () => {
  it("plays up to the pace in steps, the rest kept for the next turns", () => {
    const keyboard = { pending: ["d", "d", "s"] };
    assert.deepEqual(turnKeys(keyboard, 2), ["d", "d"]);
    assert.deepEqual(keyboard.pending, ["s"]);
    assert.deepEqual(turnKeys(keyboard, 2), ["s"]);
    assert.deepEqual(turnKeys(keyboard, 2), []);
  });

  it("plays an E alone, and keeps an E after steps for the turn after", () => {
    const keyboard = { pending: ["e", "d"] };
    assert.deepEqual(turnKeys(keyboard, 2), ["e"]);
    keyboard.pending = ["q", "e", "z"];
    assert.deepEqual(turnKeys(keyboard, 2), ["q"]);
    assert.deepEqual(turnKeys(keyboard, 2), ["e"]);
    assert.deepEqual(keyboard.pending, ["z"]);
  });
});
