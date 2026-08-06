"use client";

import { useState } from "react";
import timesData from "@/data/times.json";
import { ResultadoComparacao, Time } from "@/lib/types";

const times = timesData as Time[];

const corStatus: Record<string, string> = {
  correto: "bg-green-600 text-white",
  parcial: "bg-yellow-500 text-white",
  errado: "bg-zinc-700 text-zinc-200",
};

function seta(direcao?: "maior" | "menor") {
  if (direcao === "maior") return " ↑";
  if (direcao === "menor") return " ↓";
  return "";
}

type Modo = "diario" | "ilimitado";

export default function Home() {
  const [modo, setModo] = useState<Modo>("diario");
  const [palpiteInput, setPalpiteInput] = useState("");
  const [tentativas, setTentativas] = useState<
    { nome: string; resultado: ResultadoComparacao }[]
  >([]);
  const [venceu, setVenceu] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [tokenPartida, setTokenPartida] = useState<string | null>(null);
  const [carregandoNovoJogo, setCarregandoNovoJogo] = useState(false);

  async function iniciarNovoJogoIlimitado() {
    setCarregandoNovoJogo(true);
    const res = await fetch("/api/new-game", { method: "POST" });
    const data = await res.json();
    setTokenPartida(data.token);
    setTentativas([]);
    setVenceu(false);
    setPalpiteInput("");
    setCarregandoNovoJogo(false);
  }

  function trocarModo(novoModo: Modo) {
    setModo(novoModo);
    setTentativas([]);
    setVenceu(false);
    setPalpiteInput("");
    setTokenPartida(null);
    if (novoModo === "ilimitado") {
      iniciarNovoJogoIlimitado();
    }
  }

  async function enviarPalpite(time: Time) {
    if (modo === "ilimitado" && !tokenPartida) return;

    setCarregando(true);
    const res = await fetch("/api/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guess: time.id,
        modo,
        token: modo === "ilimitado" ? tokenPartida : undefined,
      }),
    });
    const resultado: ResultadoComparacao = await res.json();
    setTentativas((prev) => [...prev, { nome: time.nome, resultado }]);
    if (resultado.acertou) setVenceu(true);
    setPalpiteInput("");
    setCarregando(false);
  }

  const sugestoes = palpiteInput
    ? times.filter((t) =>
        t.nome.toLowerCase().includes(palpiteInput.toLowerCase())
      )
    : [];

  return (
    <main className="min-h-screen bg-zinc-900 text-white flex flex-col items-center py-10 px-4">
      <h1 className="text-3xl font-bold mb-2">⚽ Futeboldle</h1>
      <p className="text-zinc-400 mb-4">
        {modo === "diario" ? "Adivinhe o time do dia" : "Adivinhe o time sorteado"}
      </p>

      <div className="flex gap-2 mb-6 bg-zinc-800 rounded-lg p-1">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            modo === "diario" ? "bg-zinc-600 text-white" : "text-zinc-400"
          }`}
          onClick={() => trocarModo("diario")}
        >
          Diário
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            modo === "ilimitado" ? "bg-zinc-600 text-white" : "text-zinc-400"
          }`}
          onClick={() => trocarModo("ilimitado")}
        >
          Ilimitado
        </button>
      </div>

      {modo === "ilimitado" && (venceu || carregandoNovoJogo) && (
        <button
          className="mb-6 px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500 font-semibold disabled:opacity-50"
          onClick={iniciarNovoJogoIlimitado}
          disabled={carregandoNovoJogo}
        >
          {carregandoNovoJogo ? "Sorteando..." : "Jogar de novo"}
        </button>
      )}

      {modo === "ilimitado" && !tokenPartida && !carregandoNovoJogo && (
        <p className="text-zinc-500 text-sm mb-6">Preparando partida...</p>
      )}

      {!venceu && (modo === "diario" || tokenPartida) && (
        <div className="relative w-full max-w-sm mb-8">
          <input
            className="w-full rounded-lg px-4 py-2 text-black"
            placeholder="Digite o nome do time..."
            value={palpiteInput}
            onChange={(e) => setPalpiteInput(e.target.value)}
            disabled={carregando || carregandoNovoJogo}
          />
          {sugestoes.length > 0 && (
            <ul className="absolute z-10 w-full bg-zinc-800 rounded-lg mt-1 overflow-hidden">
              {sugestoes.map((t) => (
                <li
                  key={t.id}
                  className="px-4 py-2 hover:bg-zinc-700 cursor-pointer"
                  onClick={() => enviarPalpite(t)}
                >
                  {t.nome}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {venceu && (
        <div className="mb-6 text-green-400 font-semibold text-lg">
          🎉 Você acertou em {tentativas.length} tentativa(s)!
        </div>
      )}

      <div className="w-full max-w-3xl overflow-x-auto">
        <div className="grid grid-cols-8 gap-2 text-xs font-semibold text-zinc-400 mb-2 min-w-[760px]">
          <span>Time</span>
          <span>Estado</span>
          <span>Região</span>
          <span>Fundação</span>
          <span>Divisão</span>
          <span>Tít. Estaduais</span>
          <span>Tít. Nacionais</span>
          <span>Tít. Internacionais</span>
        </div>

        {tentativas
          .slice()
          .reverse()
          .map((t, i) => (
            <div
              key={i}
              className="grid grid-cols-8 gap-2 mb-2 min-w-[760px]"
            >
              <span className="flex items-center px-2">{t.nome}</span>
              <span
                className={`rounded px-2 py-2 text-center ${
                  corStatus[t.resultado.atributos.estado.status]
                }`}
              >
                {t.resultado.atributos.estado.valor}
              </span>
              <span
                className={`rounded px-2 py-2 text-center ${
                  corStatus[t.resultado.atributos.regiao.status]
                }`}
              >
                {t.resultado.atributos.regiao.valor}
              </span>
              <span
                className={`rounded px-2 py-2 text-center ${
                  corStatus[t.resultado.atributos.fundacao.status]
                }`}
              >
                {t.resultado.atributos.fundacao.valor}
                {seta(t.resultado.atributos.fundacao.direcao)}
              </span>
              <span
                className={`rounded px-2 py-2 text-center ${
                  corStatus[t.resultado.atributos.divisao.status]
                }`}
              >
                {t.resultado.atributos.divisao.valor}
              </span>
              <span
                className={`rounded px-2 py-2 text-center ${
                  corStatus[t.resultado.atributos.titulosEstaduais.status]
                }`}
              >
                {t.resultado.atributos.titulosEstaduais.valor}
                {seta(t.resultado.atributos.titulosEstaduais.direcao)}
              </span>
              <span
                className={`rounded px-2 py-2 text-center ${
                  corStatus[t.resultado.atributos.titulosNacionais.status]
                }`}
              >
                {t.resultado.atributos.titulosNacionais.valor}
                {seta(t.resultado.atributos.titulosNacionais.direcao)}
              </span>
              <span
                className={`rounded px-2 py-2 text-center ${
                  corStatus[t.resultado.atributos.titulosInternacionais.status]
                }`}
              >
                {t.resultado.atributos.titulosInternacionais.valor}
                {seta(t.resultado.atributos.titulosInternacionais.direcao)}
              </span>
            </div>
          ))}
      </div>
    </main>
  );
}