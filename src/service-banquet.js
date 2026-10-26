/**
 * The banquet (Sami, 26/10/2026, step 2 of docs/recherche/feuille-de-route.md; docs/recherche/traiteur.md): the
 * orders are known from the start, `covers` guests, a course a dish, each sent at its turn (`at`): the starter, then
 * the main course. A dish made waits at the pass, kept warm (« l'étuve »), `pass` turns at most, else it is lost and
 * made again; a course goes out whole, at its turn and not before, in time up to `slack` turns after. It is the
 * tables' machinery (service-tables.js): a course is a table that waits for its turn. `setup.banquet`, off by default.
 *
 * Each banquet is drawn from its seed, as a caterer never cooks the same one twice: one guest more or less than
 * `covers`, each course sent up to `spread` turns before or after its turn. The figures are hypotheses, not sources:
 * six guests, a salad at turn 70, a soup at turn 130, ten turns either way, five of slack, sixty warm. At eight guests
 * and thirty turns warm, no kitchen could send a course: one dish a trip, the first ones died before the last came
 * (docs/metiers.md).
 */
export const BANQUET = Object.freeze({
  covers: 6,
  courses: Object.freeze([Object.freeze({ recipe: "salade", at: 70 }), Object.freeze({ recipe: "soupe", at: 130 })]),
  spread: 10,
  slack: 5,
  pass: 60,
  // The batch (service-batch.js): dishes of a course made together, a turn more to cut each; 1, none.
  batch: 1,
  extra: 1,
});

/** The banquet's orders, all known at the start, drawn by `rng`: `{ id, recipe, arrival, deadline, table, sendAt }`, a course a table. */
export function drawBanquet(setup, rng) {
  const { covers, courses, slack, spread } = setup.banquet;
  const guests = covers - 1 + rng.int(3);
  const orders = [];
  courses.forEach((course, i) => {
    const at = course.at - spread + rng.int(2 * spread + 1);
    for (let guest = 0; guest < guests; guest += 1) orders.push({ id: orders.length + 1, recipe: course.recipe, arrival: 0, deadline: at + slack, table: i + 1, sendAt: at });
  });
  return orders;
}
