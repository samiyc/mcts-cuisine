/**
 * The page's frame (Sami, 26/10/2026, lopin's layout as mcts-urgences wired it): the tabs in the band at the top, the
 * one in the address or remembered opening first, and the panel on the left that folds. What the browser remembers
 * (the tab, the fold) is a convenience: refused storage only forgets it.
 */
export const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
export const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage refused: only not remembered.
  }
};

const TAB_KEY = "cuisine-onglet";
const FOLD_KEY = "cuisine-replie";

/** The tab to open first among `names`: the address's, the one remembered, or the first. */
export const firstTab = (names) => [location.hash.slice(1), read(TAB_KEY)].find((name) => names.includes(name)) ?? names[0];

/** Marks `tab` selected in the band, in the address and in what the browser remembers. */
export function showTab(tab) {
  for (const button of document.querySelectorAll(".tabs [role=tab]")) button.setAttribute("aria-selected", String(/** @type {HTMLElement} */ (button).dataset.tab === tab));
  if (location.hash.slice(1) !== tab) history.replaceState(null, "", `#${tab}`);
  write(TAB_KEY, tab);
}

/** A click on a tab, or a tab named in the address (a link, the back button), calls `open(name)`. */
export function wireTabs(names, open) {
  document.querySelector(".tabs").addEventListener("click", (event) => {
    const name = /** @type {HTMLElement | null} */ (/** @type {HTMLElement} */ (event.target).closest?.("[data-tab]"))?.dataset.tab;
    if (name) open(name);
  });
  window.addEventListener("hashchange", () => {
    const name = location.hash.slice(1);
    if (names.includes(name)) open(name);
  });
}

/** The button that folds the panel on the left (« / »), remembered in this browser. */
export function wireFold(layout) {
  const fold = document.getElementById("fold");
  const setFolded = (folded) => {
    layout.classList.toggle("folded", folded);
    fold.setAttribute("aria-expanded", String(!folded));
    fold.textContent = folded ? "»" : "«";
    fold.title = folded ? "Déplier le panneau" : "Replier le panneau";
    write(FOLD_KEY, folded ? "1" : "0");
  };
  fold.addEventListener("click", () => setFolded(!layout.classList.contains("folded")));
  setFolded(read(FOLD_KEY) === "1");
}
