import { NextResponse } from "next/server";
import { todosOsTimes } from "@/lib/time-do-dia";
import { encriptarId } from "@/lib/crypto";

export async function POST() {
  const times = todosOsTimes();
  const escolhido = times[Math.floor(Math.random() * times.length)];
  const token = encriptarId(escolhido.id);
  return NextResponse.json({ token });
}
