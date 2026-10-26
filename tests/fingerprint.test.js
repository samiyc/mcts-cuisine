import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { KITCHENS } from "../src/kitchens.js";
import { playReplay } from "../src/replay.js";
import { HUMANS, RULES, humansOf } from "../src/rules.js";
import { searchRule } from "../src/search.js";
import { measuresOf, runService } from "../src/simulate.js";

/**
 * What the kitchen does, held in a few hashes (Sami, 26/10/2026, before the code went under the lint budget, as in
 * mcts-urgences and mcts-entrepot): a refactor must leave every one unchanged. A change meant to alter what the model
 * does updates its hash here, and its commit says so, with the measures before and after.
 */
const EXPECTED = {
  rules: "9145985725905f31",
  variants: "7c3bea5bc808ab9e",
  replay: "165960bd12b38780",
  search: "976ec2207dff02a8",
  added: "fdfa47f31adf4af5",
};

const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 16);

/** A service's trace: everything it logged, its measures, and where each cook ended with its counters. */
const traceOf = (state, measures) => ({ log: state.log, measures, cooks: state.cooks.map((cook) => [cook.x, cook.y, cook.moves, cook.waits]) });
const played = (setup, seed, rule, humanName) => {
  const { state, measures } = runService(setup, seed, rule, HUMANS[humanName] ?? null);
  return traceOf(state, measures);
};
// The humans each service may have (the one who follows his table only with tables), and none.
const humanNames = (setup) => [...humansOf(setup), "none"];

// The seven kitchens of 22-23/10, fixed: a kitchen added later has its own fingerprint (`added`) and changes none of these.
const SEVEN = ["petite", "couloir", "brigade", "comptoirs", "postes", "separee", "detour"];
// The kitchens added on 26/10 in the evening (new stations in new kitchens, Sami).
const ADDED = ["dark"];

const FINGERPRINTS = {
  // Every kitchen of the seven under every rule, with every simulated human it may have and none, two services each.
  rules: () => SEVEN.map((id) => KITCHENS[id]).flatMap((setup) => [1, 2].flatMap((seed) => Object.values(RULES).flatMap((rule) => humanNames(setup).map((human) => played(setup, seed, rule, human))))),
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
  // The kitchens added since, under the quickest dish and the backward planning, the urgent cook, two services each.
  added: () => ADDED.flatMap((id) => [1, 2].flatMap((seed) => [RULES.quickest, RULES.retro].map((rule) => played(KITCHENS[id], seed, rule, "urgent")))),
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
