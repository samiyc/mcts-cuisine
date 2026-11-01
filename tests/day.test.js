import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DAY_PLAN, dayLayout } from "../src/day-plan.js";
import { MENU, portionsOf } from "../src/day-menu.js";
import { DELIVERY, WALK } from "../src/day-program.js";
import { STREAMS } from "../src/day-waste.js";
import { dayMeasures } from "../src/day-measures.js";
import { runDay } from "../src/day.js";
import { clockOf, sceneAt } from "../src/day-scene.js";

const SEEDS = [1, 2, 3];
const days = new Map();
const dayOf = (seed) => {
  if (!days.has(seed)) days.set(seed, runDay({ seed }));
  return days.get(seed);
};

/** The showcase's day (docs/journee.md, Sami 1/11/2026): what must hold whatever the seed. */
describe("the plan of the day (src/day-plan.js)", () => {
  it("has every line the same width, and every station reached from the dock", () => {
    const widths = new Set(DAY_PLAN.split("\n").map((line) => line.length));
    assert.equal(widths.size, 1, `largeurs : ${[...widths]}`);
    const layout = dayLayout();
    for (const station of Object.values(layout.stations).flat()) assert.ok(station.access.some((cell) => layout.steps(layout.dock, cell) >= 0), station.key);
    assert.equal(layout.tables.length, 16);
    assert.ok(layout.tables.every((table) => table.seats.length === 4));
  });

  it("keeps one path for each pair of cells, and walks it on the floor", () => {
    const layout = dayLayout();
    const path = layout.pathOf(layout.back, layout.entry);
    assert.equal(layout.pathOf(layout.back, layout.entry), path);
    assert.deepEqual(path.at(-1), layout.entry);
    for (const cell of path) assert.ok(".Dxyg".includes(layout.plan.at(cell.x, cell.y)), `${cell.x},${cell.y}`);
  });

  it("refuses, in French, a plan it cannot play", () => {
    assert.throws(() => dayLayout(DAY_PLAN.replaceAll("Z", ".")), /la cellule de refroidissement/);
    assert.throws(() => dayLayout(DAY_PLAN.replace("##########DD####", "################")), /quai/);
  });
});

describe("the day (src/day.js)", () => {
  it("plays the same from the same seed", () => {
    const tracks = (day) => JSON.stringify(day.people.map((person) => person.track));
    assert.equal(tracks(runDay({ seed: 1 })), tracks(dayOf(1)));
  });

  for (const seed of SEEDS) {
    it(`puts one person at a time at a station (seed ${seed})`, () => {
      const byStation = Map.groupBy(dayOf(seed).uses.filter((use) => !["floor", "table"].includes(use.kind)), (use) => use.key);
      for (const [key, uses] of byStation) {
        const sorted = uses.toSorted((a, b) => a.t0 - b.t0);
        sorted.slice(1).forEach((use, i) => assert.ok(use.t0 >= sorted[i].t1, `${key} : ${sorted[i].who} et ${use.who}`));
      }
    });

    it(`puts away every crate of the truck, the stock never below zero (seed ${seed})`, () => {
      const { gauges } = dayOf(seed);
      assert.equal(gauges.camion.at(-1)[1], 0);
      for (const lot of DELIVERY.lots) assert.ok(gauges[lot.store].some(([, value]) => value === lot.crates), lot.label);
      for (const [name, series] of Object.entries(gauges)) assert.ok(series.every(([, value]) => value >= 0), name);
    });

    it(`makes every batch ahead, cooled within the 2 hours (seed ${seed})`, () => {
      const { gauges, log } = dayOf(seed);
      for (const dish of MENU) assert.equal(Math.max(...gauges[portionsOf(dish)].map(([, value]) => value)), dish.batches * dish.portions, dish.id);
      const cooled = log.filter((one) => one.type === "cooled");
      assert.equal(cooled.length, MENU.filter((dish) => dish.chain.some((step) => step.chill)).reduce((sum, dish) => sum + dish.batches, 0));
      for (const one of cooled) assert.ok(one.seconds <= 2 * 3600, `${one.dish} : ${one.seconds} s`);
    });

    it(`sends every ticket of the evening, in less than an hour (seed ${seed})`, () => {
      const { gauges, log } = dayOf(seed);
      assert.equal(gauges.bons.at(-1)[1], 0);
      const tickets = log.filter((one) => one.type === "ticket");
      assert.ok(tickets.length > 30, String(tickets.length));
      for (const ticket of tickets) assert.ok(ticket.seconds < 3600, `table ${ticket.table} : ${ticket.seconds} s`);
      assert.equal(gauges.envoyes.at(-1)[1], tickets.reduce((sum, ticket) => sum + ticket.dishes, 0));
    });

    it(`serves every group of guests, who all leave, a table to one group at a time (seed ${seed})`, () => {
      const { people, log, gauges } = dayOf(seed);
      const guests = people.filter((one) => one.kind === "guest");
      assert.ok(guests.length >= 56, String(guests.length));
      for (const guest of guests) assert.equal(guest.track.at(-1).kind, "gone", guest.name);
      assert.equal(gauges.clients.at(-1)[1], 0);
      assert.equal(gauges.partis.at(-1)[1], guests.length);
      assert.ok(log.filter((one) => one.type === "group").every((group) => group.seconds > 20 * 60));
    });

    it(`closes: everyone gone by the end of the night, each cook out once for a break (seed ${seed})`, () => {
      const { people, log, end } = dayOf(seed);
      for (const person of people) assert.equal(person.track.at(-1).kind, "gone", person.name);
      assert.equal(log.filter((one) => one.type === "closed").length, 1);
      assert.ok(end < 25 * 3600, `fin : ${clockOf(end)}`);
      const cooks = people.filter((one) => one.kind === "cook");
      assert.equal(log.filter((one) => one.type === "break").length, cooks.length);
      for (const cook of cooks) assert.ok(log.some((one) => one.type === "drink" && one.who === cook.id), `${cook.name} n'a jamais bu`);
    });

    it(`measures the day (seed ${seed})`, () => {
      const measures = dayMeasures(dayOf(seed));
      assert.ok(measures.guests >= 56 && measures.plates > measures.guests, JSON.stringify(measures));
      assert.ok(measures.ticketMean > 0 && measures.ticketMean <= measures.ticketP90 && measures.ticketP90 <= measures.ticketMax);
      assert.ok(measures.cooledMax <= 120);
      assert.equal(measures.staff.length, 17);
      for (const station of measures.stations) assert.ok(station.highest <= station.count, station.kind);
    });

    it(`takes all the waste out, sorted, the biowaste near its published figure (seed ${seed})`, () => {
      const day = dayOf(seed);
      const { waste } = dayMeasures(day);
      for (const stream of Object.keys(STREAMS)) {
        assert.equal(day.gauges[`dechet:${stream}`].at(-1)[1], 0, `${stream} : le bac n'est pas vide`);
        assert.ok(waste[stream] > 0, stream);
      }
      assert.equal(day.gauges.local.at(-1)[1], day.log.filter((one) => one.type === "bag").reduce((sum, bag) => sum + bag.grams, 0));
      assert.ok(waste.bioPerGuest >= 100 && waste.bioPerGuest <= 170, `${waste.bioPerGuest} g`);
    });

    it(`seats a group only at a laid table, each table cleared, wiped and laid in turn (seed ${seed})`, () => {
      const byTable = Map.groupBy(dayOf(seed).log.filter((one) => one.type === "table"), (one) => one.table);
      assert.equal(byTable.size, 16);
      const NEXT = { laid: "taken", taken: "dirty", dirty: "clean", clean: "laid" };
      for (const [table, states] of byTable) {
        assert.equal(states[0].state, "laid", `table ${table}`);
        states.slice(1).forEach((one, i) => assert.equal(one.state, NEXT[states[i].state], `table ${table}`));
        assert.equal(states.at(-1).state, "laid", `table ${table} : pas redressée`);
      }
    });

    it(`pours every round at the bar, which never runs out, each round brought by a waiter (seed ${seed})`, () => {
      const day = dayOf(seed);
      const { bar } = dayMeasures(day);
      assert.ok(bar.poured > 80, String(bar.poured));
      assert.equal(bar.short, 0);
      assert.equal(day.gauges.verres.at(-1)[1], 0);
      const barman = day.people.find((one) => one.kind === "barman");
      assert.equal(barman.track.at(-1).kind, "gone");
      assert.ok(barman.worked > 3600, String(barman.worked));
    });

    it(`writes each cook's thirst and fatigue, within their bounds, the fatigue up by the night (seed ${seed})`, () => {
      for (const cook of dayOf(seed).people.filter((one) => one.kind === "cook")) {
        const parts = cook.track.filter((part) => part.fatigue !== undefined);
        assert.ok(parts.every((part) => part.thirst >= 0 && part.thirst <= 1 && part.fatigue >= 0 && part.fatigue <= 1), cook.name);
        assert.ok(parts.at(-1).fatigue > parts[0].fatigue, cook.name);
      }
    });

    it(`keeps everyone on the floor as they walk (seed ${seed})`, () => {
      const { layout, people } = dayOf(seed);
      for (const part of people.flatMap((person) => person.track).filter((one) => one.path)) {
        part.path.forEach((cell) => assert.ok(layout.steps(cell, layout.dock) >= 0, `${cell.x},${cell.y}`));
      }
    });
  }
});

describe("the scene of the day (src/day-scene.js)", () => {
  it("shows nobody before the day, then someone walking between two cells", () => {
    const day = dayOf(1);
    assert.equal(sceneAt(day, day.start - 1).people.length, 0);
    const walker = day.people.find((person) => person.track.some((part) => part.path?.length > 2));
    const part = walker.track.find((one) => one.path?.length > 2);
    const seen = sceneAt(day, part.t0 + WALK / 2).people.find((one) => one.id === walker.id);
    const [a, b] = part.path;
    assert.deepEqual([seen.x, seen.y], [(a.x + b.x) / 2, (a.y + b.y) / 2]);
    assert.equal(seen.doing, "walk");
  });

  it("shows a guest on their seat, as a guest", () => {
    const day = dayOf(1);
    const guest = day.people.find((person) => person.kind === "guest");
    const part = guest.track.find((one) => one.kind === "sit");
    const seen = sceneAt(day, part.t0 + 1).people.find((one) => one.id === guest.id);
    assert.deepEqual([seen.kind, seen.x, seen.y], ["guest", part.seat.x, part.seat.y]);
  });

  it("gives the clock and the phase", () => {
    assert.equal(clockOf(20 * 3600 + 5 * 60), "20 h 05");
    assert.equal(clockOf(24 * 3600 + 14 * 60), "0 h 14");
    const day = dayOf(1);
    assert.equal(sceneAt(day, 8.5 * 3600).phase.id, "reception");
    assert.equal(sceneAt(day, 20 * 3600).phase.id, "service");
  });
});
