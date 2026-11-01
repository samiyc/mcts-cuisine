import { MENU } from "../src/day-menu.js";
import { fixed } from "./dom.js";

/**
 * The words of the day's review (Sami, 1/11/2026, docs/journee.md), read from its measures (src/day-measures.js).
 */

/** What the kitchen made from the diary, and what came of it. */
export function forecastWords({ booked, absent, walkIns, covers, margin, batches }, { production, refused }) {
  const lots = MENU.map((dish) => `${dish.label} ${batches[dish.id]}`).join(", ");
  return `Prévu d'après le carnet : ${covers} couverts à table (${booked} réservés, moins ${absent} absents attendus, plus ${walkIns} sans réservation), ${production.seated} venus. Les lots, avec ${Math.round(100 * margin)} % de marge : ${lots}. ${production.made} portions faites, ${production.left} restes, ${refused} manquantes.`;
}

/** The day's review, in a sentence. */
export function reviewWords(one) {
  return `${one.guests} clients, dont ${one.bookings.barGuests} au bar sans réservation ; ${one.bookings.written} réservations, ${one.bookings.absent} absentes, ${one.bookings.refused} refusées. ${one.tables} tables servies, ${one.plates} assiettes. Un bon : ${fixed(one.ticketMean)} min en moyenne, ${fixed(one.ticketMax)} au pire. Une table : ${fixed(one.tableMean)} min, et ${fixed(one.bookings.waitMean)} min d'attente de sa table quand on a réservé (${fixed(one.bookings.waitMax)} au pire). Au bar : ${one.bar.poured} verres. Déchets : ${fixed(one.waste.bio + one.waste.emballages + one.waste.verre + one.waste.ordures)} kg, dont ${one.waste.bioPerGuest} g de biodéchets par client. Fermé à ${one.closedAt}.`;
}
