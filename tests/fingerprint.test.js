import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { KITCHENS } from "../src/kitchens.js";
import { playReplay } from "../src/replay.js";
import { HUMANS, RULES } from "../src/rules.js";
import { searchRule } from "../src/search.js";
import { measuresOf, runService } from "../src/simulate.js";

/**
 * What the kitchen does, held in a few hashes (Sami, 26/10/2026, before the code went under the lint budget, as in
 * mcts-urgences and mcts-entrepot): a refactor must leave every one unchanged. A change meant to alter what the model
 * does updates its hash here, and its commit says so, with the measures before and after.
 */
const EXPECTED = {
  rules: "8624be379e6f854f",
  variants: "7e0ac6b8664048e9",
  replay: "f5d212c7547ac3f9",
  search: "3e54137621c803a6",
};

const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);

/** A service's trace: everything it logged, its measures, and where each cook ended with its counters. */
const traceOf = (state, measures) => ({ log: state.log, measures, cooks: state.cooks.map((cook) => [cook.x, cook.y, cook.moves, cook.waits]) });
const played = (setup, seed, rule, humanName) => {
  const { state, measures } = runService(setup, seed, rule, HUMANS[humanName] ?? null, humanName);
  return traceOf(state, measures);
};
const HUMAN_NAMES = [...Object.keys(HUMANS), "none"];

const FINGERPRINTS = {
  // Every kitchen under every rule, with every simulated human and none, two services each.
  rules: () => Object.values(KITCHENS).flatMap((setup) => [1, 2].flatMap((seed) => Object.values(RULES).flatMap((rule) => HUMAN_NAMES.map((human) => played(setup, seed, rule, human))))),
  // The settings the kitchens leave at their defaults: cooking watched, no roles, a soup that burns at once.
  variants: () =>
    [
      { ...KITCHENS.petite, unattended: null },
      { ...KITCHENS.postes, roles: [] },
      { ...KITCHENS.comptoirs, unattended: null },
      { ...KITCHENS.detour, roles: [] },
      { ...KITCHENS.petite, unattended: { burn: 0, clean: 5 } },
    ].flatMap((setup) => [1, 2].flatMap((seed) => [RULES.oldest, RULES.quickest].map((rule) => played(setup, seed, rule, "urgent")))),
  // Sami's replay of 23/10, the chef at the keyboard: the keys, the robots, the anomalies.
  replay: () => {
    const replay = JSON.parse(readFileSync(new URL("./fixtures/chef-on-the-robots-cell.json", import.meta.url), "utf8"));
    const { state, anomalies } = playReplay(replay);
    return { ...traceOf(state, measuresOf(state)), anomalies };
  },
  // A service played by the search, at a small budget.
  search: () => played(KITCHENS.petite, 1, searchRule({ budget: 16 }), "urgent"),
};

describe("the fingerprints of the kitchen (a refactor changes none)", () => {
  for (const [name, compute] of Object.entries(FINGERPRINTS)) {
    it(`keeps the ${name} unchanged`, () => {
      assert.equal(digest(compute()), EXPECTED[name], `${name} : le comportement a changé`);
    });
  }
});
