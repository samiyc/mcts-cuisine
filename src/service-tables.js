import { RECIPES } from "./kitchens.js";
import { FREE } from "./service-basics.js";
import { refuseIfOut } from "./service-supply.js";

/**
 * The tables (Sami, 26/10/2026, step 1 of docs/recherche/feuille-de-route.md; his choice: a table is a group of
 * orders). A table orders two or three dishes at once, each an order of one dish with the table's number and its
 * deadline. A dish made goes to the pass and waits for its table there (status "passed"); the table is sent, every
 * dish served, the turn its last one comes. A dish left at the pass more than `pass` turns « dies »: it is lost, its
 * order goes back to open, to make again (« à la volée »). `setup.tables`: `{ min, max, pass }`, off by default.
 *
 * The pace: a table comes every `every` turns times its mean size, so that a service has about as many dishes with
 * tables as without (a hypothesis, not a source).
 */
export const TABLES = Object.freeze({ min: 2, max: 3, pass: 10 });

/** The turns before the next table, drawn at the service's pace. */
const gapOf = (setup, rng) => Math.max(1, Math.round(-setup.every * ((setup.tables.min + setup.tables.max) / 2) * Math.log(1 - rng.next())));

/** The orders of a table come at `at`: its size drawn, each dish drawn, ids from `next.id`, the table `next.table`. */
function tableAt(setup, rng, at, next) {
  const names = Object.keys(RECIPES);
  const { min, max } = setup.tables;
  const size = min + rng.int(max - min + 1);
  const orders = [];
  for (let i = 0; i < size; i += 1) orders.push({ id: next.id + i, recipe: names[rng.int(names.length)], arrival: at, deadline: at + setup.patience, table: next.table });
  return orders;
}

/**
 * The tables' orders from turn `start` to the last order, drawn by `rng`: `{ id, recipe, arrival, deadline, table }`,
 * ids after `lastId`, tables after `lastTable`.
 */
export function drawTables(setup, rng, { start, lastId = 0, lastTable = 0 }) {
  const orders = [];
  for (let at = start, table = lastTable + 1; at <= setup.lastOrder; at += gapOf(setup, rng), table += 1) {
    orders.push(...tableAt(setup, rng, at, { id: lastId + orders.length + 1, table }));
  }
  return orders;
}

/** The first table after turn `t`: the gap drawn as the next ones. */
export const firstAfter = (setup, rng, t) => t + gapOf(setup, rng);

/** `cook`'s dish, made, goes to the pass to wait for its table. */
export function toPass(state, cook, order) {
  Object.assign(order, { status: "passed", passedAt: state.t, cook: null });
  state.log.push({ t: state.t, type: "passed", cook: cook.id, order: order.id });
  Object.assign(cook, FREE);
}

/** The orders of `table` still to serve: every one of them, but a dish refused (off the menu, service-supply.js), which the table goes without. */
const tableOrders = (state, table) => state.upcoming.filter((order) => order.table === table && order.status !== "refused");

/** A table whose every dish is at the pass is sent: its dishes served this turn. */
function sendTables(state) {
  const tables = new Set(state.upcoming.filter((order) => order.status === "passed").map((order) => order.table));
  for (const table of tables) {
    const orders = tableOrders(state, table);
    if (!orders.every((order) => order.status === "passed")) continue;
    for (const order of orders) Object.assign(order, { status: "served", servedAt: state.t });
    state.log.push({ t: state.t, type: "sent", table, orders: orders.map((order) => order.id) });
  }
}

/** A dish left at the pass more than `pass` turns dies: lost, its order to make again. */
function dieAtPass(state) {
  for (const order of state.upcoming) {
    if (order.status !== "passed" || state.t - order.passedAt <= state.setup.tables.pass) continue;
    Object.assign(order, { status: "open", passedAt: null, died: (order.died ?? 0) + 1 });
    refuseIfOut(state, order);
    state.died = (state.died ?? 0) + 1;
    state.log.push({ t: state.t, type: "died", order: order.id });
  }
}

/** The pass, at the start of a turn: the tables complete are sent, then the dishes that waited too long die. */
export function watchPass(state) {
  if (!state.setup.tables) return;
  sendTables(state);
  dieAtPass(state);
}

/** The dishes an event of the log takes off the pass: a table sent, a dish dead. */
const leaving = (event) => (event.type === "sent" ? event.orders : [event.order]);

/** The longest a dish waited at the pass, sent, dead or still there, as the log tells it. */
function longestAtPass(state) {
  const since = new Map();
  const waits = [0];
  for (const event of state.log) {
    if (event.type === "passed") since.set(event.order, event.t);
    if (event.type === "sent" || event.type === "died") waits.push(...leaving(event).map((id) => event.t - since.get(id)));
  }
  const still = state.upcoming.filter((order) => order.status === "passed");
  return Math.max(...waits, ...still.map((order) => state.t - order.passedAt));
}

/** The tables' measures: the tables come, those sent in time (every dish by the deadline), the dishes dead at the pass, the longest wait there. */
export function tableMeasures(state) {
  if (!state.setup.tables) return {};
  const come = new Set(state.upcoming.filter((order) => order.table && order.arrival <= state.t).map((order) => order.table));
  const servedInTime = (orders) => orders.length > 0 && orders.every((order) => order.status === "served" && order.servedAt <= order.deadline);
  const inTime = [...come].filter((table) => servedInTime(tableOrders(state, table)));
  return { tables: come.size, tablesOnTime: inTime.length, died: state.died ?? 0, maxPass: longestAtPass(state) };
}
