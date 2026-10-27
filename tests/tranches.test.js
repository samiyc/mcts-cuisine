import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { minutesOf, slicesOf, wordsOf } from "../scripts/tranches.js";

/** The night file cut in jobs of 30 minutes at most (Sami, 27/10/2026, mcts-commun's recommendations). */
describe("the night's slices (scripts/tranches.js)", () => {
  it("reads and writes the queue's durations", () => {
    assert.deepEqual(["40 min", "2 h", "1 h 30", "3 h 05"].map(minutesOf), [40, 120, 90, 185]);
    assert.deepEqual([40, 120, 90, 185].map(wordsOf), ["40 min", "2 h", "1 h 30", "3 h 05"]);
  });

  it("cuts a long measure in slices of the same services, then gathers them under its own id", () => {
    const job = { id: "cuis-banquet-brigade-urgent", command: "npm run compare -- --kitchen brigade --services 30 --banquet --search --humain urgent", estimate: "3 h 20", priority: 1 };
    const jobs = slicesOf(job);
    assert.equal(jobs.length, 9);
    assert.deepEqual(jobs.slice(0, 8).map((one) => /--services (\d+) --de (\d+)/.exec(one.command).slice(1).join("@")), ["4@1", "4@5", "4@9", "4@13", "4@17", "4@21", "4@25", "2@29"]);
    assert.ok(jobs.every((one) => one.command.endsWith("--lignes") && one.priority === 1));
    assert.deepEqual(jobs.slice(0, 8).map((one) => [one.estimate, one.limit])[0], ["25 min", 75]);
    const gather = jobs.at(-1);
    assert.equal(gather.id, job.id);
    assert.equal(gather.command, `${job.command} --lignes`);
    assert.deepEqual(gather.after, jobs.slice(0, 8).map((one) => one.id));
  });

  it("leaves a short measure whole, its lines written and its limit past the worst case", () => {
    assert.deepEqual(slicesOf({ id: "cuis-carte-petite-none", command: "npm run compare -- --kitchen petite --services 50 --humain none", estimate: "10 min" }), [
      { id: "cuis-carte-petite-none", command: "npm run compare -- --kitchen petite --services 50 --humain none --lignes", estimate: "10 min", limit: 30 },
    ]);
  });
});
