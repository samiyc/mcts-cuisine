import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { nextSpeed, playerKey, within } from "../web/player-keys.js";
import { toThePlayer } from "../web/player.js";
import { SPEEDS } from "../web/tabs/service.js";

/** A player at turn 40 of 200 that writes down what the keys asked. */
function playerAt(t = 40) {
  const asked = [];
  return { asked, t: () => t, end: () => 200, seek: (to) => asked.push(["seek", to]), toggle: () => asked.push(["toggle"]), faster: (way) => asked.push(["faster", way]) };
}

/** A keydown on the page (`on`: the tag the focus is in), and whether it was prevented. */
function keydown(key, { code = "", on = "body", ...modifiers } = {}) {
  const event = { key, code, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false, ...modifiers, prevented: false };
  return Object.assign(event, { target: { closest: (tags) => (tags.split(", ").includes(on) ? {} : null) }, preventDefault: () => (event.prevented = true) });
}

/** The player's keys, as on a video (Sami, 29/10/2026: web/player-keys.js, as mcts-urgences'). */
describe("the player's keys (web/player-keys.js)", () => {
  it("plays or pauses with space, moves 10 turns or 50 with Shift, changes the speed, goes to a tenth", () => {
    const player = playerAt();
    for (const event of [keydown(" "), keydown("ArrowLeft"), keydown("ArrowRight", { shiftKey: true }), keydown("ArrowUp"), keydown("ArrowDown"), keydown("7")]) {
      assert.equal(playerKey(player, event), true, event.key);
      assert.equal(event.prevented, true, event.key);
    }
    assert.deepEqual(player.asked, [["toggle"], ["seek", 30], ["seek", 90], ["faster", 1], ["faster", -1], ["seek", 140]]);
  });

  it("reads a figure by its place: the AZERTY row, the keypad with num lock off, but its arrows", () => {
    const player = playerAt();
    assert.equal(playerKey(player, keydown("è", { code: "Digit7" })), true);
    assert.equal(playerKey(player, keydown("End", { code: "Numpad1" })), true);
    assert.equal(playerKey(player, keydown("ArrowLeft", { code: "Numpad4" })), true);
    assert.deepEqual(player.asked, [["seek", 140], ["seek", 20], ["seek", 30]]);
  });

  it("leaves a field's keys, space on a button, a key with Ctrl, Alt or Meta, and the others", () => {
    const player = playerAt();
    const left = [keydown("ArrowUp", { on: "select" }), keydown("5", { on: "input" }), keydown(" ", { on: "button" }), keydown("ArrowLeft", { ctrlKey: true }), keydown("r", { metaKey: true }), keydown("a"), keydown("e")];
    for (const event of left) {
      assert.equal(playerKey(player, event), false, event.key);
      assert.equal(event.prevented, false, event.key);
    }
    assert.equal(playerKey(player, keydown("ArrowRight", { on: "button" })), true);
    assert.deepEqual(player.asked, [["seek", 50]]);
  });

  it("gets from the page only space while the chef is at the keyboard (web/player.js): the arrows and the figures stay his", () => {
    assert.deepEqual([" ", "ArrowLeft", "3", "e"].map((key) => toThePlayer(true, keydown(key))), [true, false, false, false]);
    assert.deepEqual([" ", "ArrowLeft", "3"].map((key) => toThePlayer(false, keydown(key))), [true, true, true]);
  });

  it("keeps a turn within the service and a speed within the list", () => {
    assert.deepEqual([within(-10, 200), within(250, 200), within(30, 200)], [0, 200, 30]);
    assert.equal(nextSpeed(SPEEDS, 4, 1), 10);
    assert.equal(nextSpeed(SPEEDS, 10, 1), 10);
    assert.equal(nextSpeed(SPEEDS, 0.5, -1), 0.5);
    assert.equal(nextSpeed(SPEEDS, 1, -1), 0.5);
  });
});
