import times from "@/data/times.json";
import { Time } from "./types";

const DATA_BASE = new Date("2026-01-01T00:00:00-03:00");

function hojeEmBrasilia(): Date {
  const agora = new Date();
  const offsetBrasilia = -3 * 60;
  const utcMs = agora.getTime() + agora.getTimezoneOffset() * 60000;
  const brasiliaMs = utcMs + offsetBrasilia * 60000;
  const brasilia = new Date(brasiliaMs);
  brasilia.setHours(0, 0, 0, 0);
  return brasilia;
}

export function indiceDoDia(): number {
  const hoje = hojeEmBrasilia();
  const diffMs = hoje.getTime() - DATA_BASE.getTime();
  const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return ((diffDias % times.length) + times.length) % times.length;
}

export function timeDoDia(): Time {
  return (times as Time[])[indiceDoDia()];
}

export function todosOsTimes(): Time[] {
  return times as Time[];
}
