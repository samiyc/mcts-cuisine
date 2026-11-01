import { addStock, at, mark, offer } from "./day-engine.js";
import { MENU, portionsOf } from "./day-menu.js";
import { MINUTE } from "./day-program.js";

/**
 * The day's production (Sami, 1/11/2026, docs/journee.md): what is made ahead, batch by batch. Each batch walks its dish's
 * chain (day-menu.js): someone fetches and works a step; a step that goes on alone keeps its station until someone takes
 * it off; what has cooked goes to a blast chiller within the sourced limit (docs/recherche/journee.md: from +63 °C to below
 * +10 °C in less than 2 hours, or thrown away), and from there to a fridge.
 */
/** The chains' minutes by hand are a batch's alone; the sauces, garnishes and small preparations around them take this much more. */
const BY_HAND = 1.6;
const TAKE_OFF = 60;
const FETCH = 30;
const PRIORITY = Object.freeze({ step: 20, shelve: 40, hot: 60 });
/** The salads are cut last, to stay fresh. */
const LATE_FROM = 14.5 * 3600;
const WASH = Object.freeze({ at: 6, seconds: 150 });

/** A batch's legs for its step: what it holds to take off, what to fetch, then the step itself. */
function legsOf(world, batch, step) {
  const legs = [];
  if (batch.held) legs.push({ station: batch.held, seconds: TAKE_OFF, label: `retirer ${batch.dish.label}`, carry: batch.dish.emoji });
  for (const [store, crates] of Object.entries(step.fetch ?? {})) legs.push({ at: store, seconds: FETCH, label: `chercher pour ${batch.dish.label}`, carry: "📦", take: { [store]: crates } });
  legs.push({ at: step.at, seconds: step.min * MINUTE * (step.alone?.emoji === "❄️" || step.shelve ? 1 : BY_HAND), label: `${step.do} : ${batch.dish.label}`, carry: null, keep: Boolean(step.alone), done: (station) => stepDone(world, batch, station) });
  return legs;
}

/** The priority of a batch's step: hot food first, then what is ready to put away. */
function priorityOf(batch, step) {
  if (batch.held) return PRIORITY.hot;
  return step.shelve ? PRIORITY.shelve : PRIORITY.step;
}

/** Offers a batch's next step; none left, the batch is done. */
function nextStep(world, batch) {
  const step = batch.dish.chain[batch.step];
  if (!step) return;
  const task = { label: step.do, skill: step.skill, priority: priorityOf(batch, step), legs: legsOf(world, batch, step) };
  batch.held = null;
  offer(world, task);
}

/** A batch's cooling ends: how long since its cooking ended, for the rule of the 2 hours. */
function cooled(world, batch) {
  world.log.push({ type: "cooled", dish: batch.dish.id, t: world.t, seconds: world.t - batch.cookedAt });
}

/** A step that goes on alone: its station kept, shown, until it can be taken off. */
function goOnAlone(world, batch, { station, step }) {
  const { min, emoji } = step.alone;
  const t1 = world.t + min * MINUTE;
  mark(world, station, { emoji, t1, label: batch.dish.label });
  at(world, t1, () => {
    if (step.cooks) batch.cookedAt = world.t;
    if (step.chill) cooled(world, batch);
    batch.held = station;
    batch.step += 1;
    nextStep(world, batch);
  });
}

/** A step worked: pans to wash, the portions shelved, and the batch goes on. */
function stepDone(world, batch, station) {
  const step = batch.dish.chain[batch.step];
  dirtyPan(world);
  if (step.shelve) addStock(world, portionsOf(batch.dish), batch.dish.portions);
  if (step.alone) return goOnAlone(world, batch, { station, step });
  batch.step += 1;
  nextStep(world, batch);
}

/** A pan to wash: the dish room is told if nobody is on it. */
export function dirtyPan(world) {
  addStock(world, "sale", 1);
  if (world.washing || world.stock.get("sale") < 1) return;
  offerWash(world);
}

/** The next load of pans at a sink, until none is left. */
function offerWash(world) {
  const load = Math.min(WASH.at, world.stock.get("sale"));
  world.washing = true;
  offer(world, {
    label: "laver la batterie",
    skill: "plonge",
    priority: PRIORITY.step,
    legs: [{ at: "L", seconds: WASH.seconds, label: "laver la batterie", carry: null, take: { sale: load } }],
    done: () => {
      world.washing = false;
      if (world.stock.get("sale") > 0) offerWash(world);
    },
  });
}

/** Starts a batch of `dish`. */
const startBatch = (world, dish) => nextStep(world, { dish, step: 0, held: null, cookedAt: null });

/** Every dish's batches are offered; the salads, later in the day. */
export function startProduction(world) {
  for (const dish of MENU) {
    addStock(world, portionsOf(dish), 0);
    for (let n = 0; n < dish.batches; n += 1) {
      if (dish.late) at(world, LATE_FROM, () => startBatch(world, dish));
      else startBatch(world, dish);
    }
  }
}
