import { NextRequest, NextResponse } from "next/server";
import { todosOsTimes } from "@/lib/time-do-dia";
import { descriptografarId } from "@/lib/crypto";
import { Time } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const token: string | undefined = body?.token;

  if (!token) {
    return NextResponse.json(
      { error: "Token da partida ausente" },
      { status: 400 }
    );
  }

  let targetId: string;
  try {
    targetId = descriptografarId(token);
  } catch {
    return NextResponse.json(
      { error: "Token inválido ou expirado" },
      { status: 400 }
    );
  }

  const times = todosOsTimes();
  const correto = times.find((t: Time) => t.id === targetId);

  if (!correto) {
    return NextResponse.json(
      { error: "Time da partida não encontrado" },
      { status: 400 }
    );
  }

  return NextResponse.json({ time: correto });
}