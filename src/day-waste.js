import { addStock, offer } from "./day-engine.js";

/**
 * The day's waste (Sami, 1/11/2026, docs/journee.md, docs/recherche/journee.md): four bins in the kitchen, in grams, sorted as
 * the law asks of biowaste since 1/1/2024 (AGEC). A bin holding a bag's worth calls someone, who takes it out through the back
 * door to the waste room; a bin left at twice that counts as overflowing. Only the biowaste has a published figure, 134 g a
 * meal (a Veolia document, its origin not found): the model's amounts are set to come near it. The rest are hypotheses
 * (question 34).
 */
export const STREAMS = Object.freeze({
  bio: Object.freeze({ label: "les biodéchets", emoji: "🍂", bag: 3000 }),
  emballages: Object.freeze({ label: "les cartons", emoji: "📦", bag: 8000 }),
  verre: Object.freeze({ label: "le verre", emoji: "🍾", bag: 8000 }),
  ordures: Object.freeze({ label: "les ordures", emoji: "🗑️", bag: 3000 }),
});
/** What each thing leaves behind, in grams. */
export const LEFT = Object.freeze({ peelings: 80, carton: 500, film: 100, plateScraps: 25, plateRest: 20, bottle: 350, drinksABottle: 4 });
const PRIORITY = 45;
const TAKE = 30;
const DROP = 20;

const binOf = (stream) => `dechet:${stream}`;
export const inBin = (world, stream) => world.stock.get(binOf(stream)) ?? 0;

/** One bin's bag out: from a bin to the waste room, what the bin holds by the time someone comes. */
function takeOut(world, stream, skill = "dechets") {
  const { label, emoji } = STREAMS[stream];
  let carried = 0;
  world.wasteTrips[stream] = true;
  return {
    skill,
    priority: PRIORITY,
    legs: [
      {
        at: "W",
        seconds: TAKE,
        label: `sortir ${label}`,
        carry: emoji,
        done: () => {
          carried = inBin(world, stream);
          addStock(world, binOf(stream), -carried);
        },
      },
      {
        at: "U",
        seconds: DROP,
        label: `au local à déchets : ${label}`,
        carry: null,
        done: () => {
          addStock(world, "local", carried);
          addStock(world, `local:${stream}`, carried);
          world.log.push({ type: "bag", stream, grams: carried, t: world.t });
        },
      },
    ],
    done: () => {
      world.wasteTrips[stream] = false;
      callIfDue(world, stream);
    },
  };
}

/** A bag's worth in the bin and nobody on it, or anything left once the day is closing: someone is called. */
function callIfDue(world, stream) {
  if (world.wasteTrips[stream]) return;
  const held = inBin(world, stream);
  if (held >= STREAMS[stream].bag || (world.closing && held > 0)) offer(world, takeOut(world, stream, world.closing ? "prep" : "dechets"));
}

/** `grams` thrown into `stream`'s bin. */
export function throwAway(world, stream, grams) {
  addStock(world, binOf(stream), grams);
  if (inBin(world, stream) >= 2 * STREAMS[stream].bag && !world.wasteFull[stream]) {
    world.wasteFull[stream] = true;
    world.log.push({ type: "binFull", stream, t: world.t });
  }
  if (inBin(world, stream) < STREAMS[stream].bag) world.wasteFull[stream] = false;
  callIfDue(world, stream);
}

/** The bins at the start of the day. */
export function startWaste(world) {
  world.wasteTrips = {};
  world.wasteFull = {};
  world.closing = false;
  addStock(world, "local", 0);
  for (const stream of Object.keys(STREAMS)) {
    addStock(world, binOf(stream), 0);
    addStock(world, `local:${stream}`, 0);
  }
}

/** The closing: every bin emptied, whatever it holds. */
export function emptyBins(world) {
  world.closing = true;
  for (const stream of Object.keys(STREAMS)) callIfDue(world, stream);
}
