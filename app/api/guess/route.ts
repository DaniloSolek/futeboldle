import { NextRequest, NextResponse } from "next/server";
import { timeDoDia, todosOsTimes } from "@/lib/time-do-dia";
import { descriptografarId } from "@/lib/crypto";
import { ResultadoComparacao, StatusAtributo, Time } from "@/lib/types";

function compararTexto(valor: string, correto: string): StatusAtributo {
  return valor === correto ? "correto" : "errado";
}

function compararNumero(
  valor: number,
  correto: number
): { status: StatusAtributo; direcao?: "maior" | "menor" } {
  if (valor === correto) return { status: "correto" };
  return { status: "errado", direcao: valor < correto ? "maior" : "menor" };
}

function normalizarCor(cor: string): string {
  return cor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function compararCores(valor: string[], correto: string[]): StatusAtributo {
  const a = valor.map(normalizarCor);
  const b = correto.map(normalizarCor);

  const mesmasCores = a.length === b.length && a.every((c) => b.includes(c));
  if (mesmasCores) return "correto";

  if (a.some((c) => b.includes(c))) return "parcial";
  return "errado";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const guessId: string = body?.guess;
  const modo: string = body?.modo === "ilimitado" ? "ilimitado" : "diario";
  const token: string | undefined = body?.token;

  if (!guessId) {
    return NextResponse.json({ error: "Palpite inválido" }, { status: 400 });
  }

  const times = todosOsTimes();
  const palpite = times.find((t: Time) => t.id === guessId);

  if (!palpite) {
    return NextResponse.json({ error: "Time não encontrado" }, { status: 404 });
  }

  let correto: Time;

  if (modo === "ilimitado") {
    if (!token) {
      return NextResponse.json(
        { error: "Token da partida ausente. Inicie um novo jogo." },
        { status: 400 }
      );
    }
    let targetId: string;
    try {
      targetId = descriptografarId(token);
    } catch {
      return NextResponse.json(
        { error: "Token inválido ou expirado. Inicie um novo jogo." },
        { status: 400 }
      );
    }
    const encontrado = times.find((t: Time) => t.id === targetId);
    if (!encontrado) {
      return NextResponse.json(
        { error: "Time da partida não encontrado. Inicie um novo jogo." },
        { status: 400 }
      );
    }
    correto = encontrado;
  } else {
    correto = timeDoDia();
  }

  const acertou = palpite.id === correto.id;

  const coresPalpite = palpite.cores ?? [];
  const coresCorretas = correto.cores ?? [];

  const resultado: ResultadoComparacao = {
    acertou,
    nomeCorreto: acertou ? correto.nome : undefined,
    atributos: {
      estado: {
        valor: palpite.estado,
        status: compararTexto(palpite.estado, correto.estado),
      },
      regiao: {
        valor: palpite.regiao,
        status: compararTexto(palpite.regiao, correto.regiao),
      },
      fundacao: {
        valor: palpite.fundacao,
        ...compararNumero(palpite.fundacao, correto.fundacao),
      },
      divisao: {
        valor: palpite.divisao,
        status: compararTexto(palpite.divisao, correto.divisao),
      },
      cores: {
        valor: coresPalpite,
        status: compararCores(coresPalpite, coresCorretas),
      },
      titulosEstaduais: {
        valor: palpite.titulosEstaduais,
        ...compararNumero(palpite.titulosEstaduais, correto.titulosEstaduais),
      },
      titulosNacionais: {
        valor: palpite.titulosNacionais,
        ...compararNumero(palpite.titulosNacionais, correto.titulosNacionais),
      },
      titulosInternacionais: {
        valor: palpite.titulosInternacionais,
        ...compararNumero(palpite.titulosInternacionais, correto.titulosInternacionais),
      },
    },
  };

  return NextResponse.json(resultado);
}