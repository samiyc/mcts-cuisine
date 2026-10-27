import { diagnose } from "mcts-commun/mcts.js";

/**
 * What the search saw, counted a decision at a time (mcts-commun, 27/10/2026: `diagnose` on every decision, by
 * code, says which lever to work next): the decisions searched, their iterations and ms, and how many came back with
 * each of `diagnose`'s codes. `onResult` goes to `searchRule` and changes nothing it decides; `take()` hands the
 * counts so far and starts again, a service at a time.
 */
export const CODES = Object.freeze(["fewIterations", "flatScore", "closeCall", "shallow"]);

const empty = () => ({ decisions: 0, iterations: 0, ms: 0, ...Object.fromEntries(CODES.map((code) => [code, 0])) });

export function searchTally() {
  let tally = empty();
  return {
    onResult(found, depth) {
      tally.decisions += 1;
      tally.iterations += found.iterations;
      tally.ms += found.ms;
      for (const hint of diagnose(found, { depth })) tally[hint.code] += 1;
    },
    take() {
      const counts = tally;
      tally = empty();
      return counts;
    },
  };
}

/** Several services' counts added up; those without counts (written before 27/10 evening) are left out. */
export function sumOf(counts) {
  return counts.filter(Boolean).reduce((sum, one) => Object.fromEntries(Object.keys(sum).map((key) => [key, sum[key] + (one[key] ?? 0)])), empty());
}

/** The counts in words: decisions, iterations a decision, and each code's share of the decisions. */
export function tallyText(sum) {
  const share = (n) => `${Math.round((100 * n) / Math.max(sum.decisions, 1))} %`;
  const perDecision = (sum.iterations / Math.max(sum.decisions, 1)).toFixed(1).replace(".", ",");
  return `${sum.decisions} décisions, ${perDecision} itérations chacune, ${Math.round(sum.ms / 1000)} s ; ${CODES.map((code) => code + " " + share(sum[code])).join(", ")}`;
}
