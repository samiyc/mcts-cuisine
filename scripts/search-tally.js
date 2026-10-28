import { diagnose } from "mcts-commun/mcts.js";

/**
 * What the search saw, counted a decision at a time (mcts-commun, 27/10/2026: `diagnose` on every decision, by
 * code, says which lever to work next): the decisions searched, their iterations and ms, how many the early stop settled
 * (`stopped`, mcts-commun a2c66bd) and how many came back with each of `diagnose`'s codes. `onResult` goes to `searchRule` and changes nothing it decides; `take()` hands the
 * counts so far and starts again, a service at a time.
 */
export const CODES = Object.freeze(["fewIterations", "flatScore", "closeCall", "shallow"]);

// `closeSettled`: the close calls earlyStop settled (mcts-commun ef28dfd); `rank1` to `rank3`: the played move's rank in
// the root's shortlist, the third counting the rest (28/10/2026: whether more moves at the root would serve).
const empty = () => ({ decisions: 0, iterations: 0, ms: 0, settled: 0, closeSettled: 0, rank1: 0, rank2: 0, rank3: 0, ...Object.fromEntries(CODES.map((code) => [code, 0])) });

export function searchTally() {
  let tally = empty();
  return {
    onResult(found, depth) {
      tally.decisions += 1;
      tally.iterations += found.iterations;
      tally.ms += found.ms;
      if (found.stopped === "settled") tally.settled += 1;
      if (found.rank) tally[`rank${Math.min(found.rank.played, 3)}`] += 1;
      for (const hint of diagnose(found, { depth })) {
        tally[hint.code] += 1;
        if (hint.settled) tally.closeSettled += 1;
      }
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

/** The counts in words: decisions, iterations a decision, the share settled early, and each code's share of the decisions. */
export function tallyText(sum) {
  const share = (n) => `${Math.round((100 * n) / Math.max(sum.decisions, 1))} %`;
  const perDecision = (sum.iterations / Math.max(sum.decisions, 1)).toFixed(1).replace(".", ",");
  const ranks = sum.rank1 + sum.rank2 + sum.rank3 ? ` ; rang du coup joué 1 : ${share(sum.rank1)}, 2 : ${share(sum.rank2)}, 3 et plus : ${share(sum.rank3)}` : "";
  const codeText = (code) => code + " " + share(sum[code]) + (code === "closeCall" ? " (tranchés " + share(sum.closeSettled) + ")" : "");
  return `${sum.decisions} décisions, ${perDecision} itérations chacune, ${Math.round(sum.ms / 1000)} s, arrêtées tôt ${share(sum.settled)} ; ${CODES.map(codeText).join(", ")}${ranks}`;
}
