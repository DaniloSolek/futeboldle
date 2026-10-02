"use client";

import { useState, useEffect } from "react";
import timesData from "@/data/times.json";
import { ResultadoComparacao, Time } from "@/lib/types";
import { indiceDoDia } from "@/lib/time-do-dia";

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

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "");
}

function tentativaValida(
  item: unknown
): item is { time: Time; resultado: ResultadoComparacao } {
  if (!item || typeof item !== "object") return false;
  const possivel = item as { time?: unknown; resultado?: unknown };
  return (
    !!possivel.time &&
    typeof possivel.time === "object" &&
    "id" in (possivel.time as object) &&
    "nome" in (possivel.time as object) &&
    !!possivel.resultado
  );
}

const CELL_SIZE = "rounded px-2 py-2 text-center min-h-[48px] flex items-center justify-center whitespace-nowrap overflow-hidden text-ellipsis min-w-0 text-sm";

type Modo = "diario" | "ilimitado";

export default function Home() {
  const [modo, setModo] = useState<Modo>("diario");
  const [palpiteInput, setPalpiteInput] = useState("");
  const [tentativas, setTentativas] = useState<
    { time: Time; resultado: ResultadoComparacao }[]
  >([]);
  const [venceu, setVenceu] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [tokenPartida, setTokenPartida] = useState<string | null>(null);
  const [carregandoNovoJogo, setCarregandoNovoJogo] = useState(false);
  const [carregouStorage, setCarregouStorage] = useState(false);
  const diaAtual = indiceDoDia();
  const [desistiu, setDesistiu] = useState(false);
  const [timeRevelado, setTimeRevelado] = useState<Time | null>(null);
  const [revelando, setRevelando] = useState(false);

  useEffect(() => {
    if (modo !== "diario") {
      setCarregouStorage(false);
    }
  }, [modo]);

  useEffect(() => {
    if (modo !== "diario") return;

    const salvo = localStorage.getItem(`dailyAttempts_${diaAtual}`);
    if (salvo) {
      try {
        const bruto: unknown[] = JSON.parse(salvo);
        const tentativasValidas = bruto.filter(tentativaValida);

        if (tentativasValidas.length !== bruto.length) {
          console.warn(
            "Tentativas salvas em formato antigo foram descartadas."
          );
          localStorage.removeItem(`dailyAttempts_${diaAtual}`);
          setTentativas([]);
          setVenceu(false);
        } else {
          setTentativas(tentativasValidas);
          setVenceu(tentativasValidas.some((t) => t.resultado.acertou));
        }
      } catch (e) {
        console.error("Falha ao ler tentativas salvas:", e);
        localStorage.removeItem(`dailyAttempts_${diaAtual}`);
        setTentativas([]);
        setVenceu(false);
      }
    } else {
      setTentativas([]);
      setVenceu(false);
    }
    setCarregouStorage(true);
  }, [diaAtual, modo]);

  useEffect(() => {
    if (modo !== "diario" || !carregouStorage) return;
    try {
      localStorage.setItem(`dailyAttempts_${diaAtual}`, JSON.stringify(tentativas));
    } catch (e) {
      console.error("Falha ao salvar tentativas:", e);
    }
  }, [tentativas, modo, diaAtual, carregouStorage]);

  async function iniciarNovoJogoIlimitado() {
    setCarregandoNovoJogo(true);
    const res = await fetch("/api/new-game", { method: "POST" });
    const data = await res.json();
    setTokenPartida(data.token);
    setTentativas([]);
    setVenceu(false);
    setDesistiu(false);
    setTimeRevelado(null);
    setPalpiteInput("");
    setCarregandoNovoJogo(false);
  }

  function trocarModo(novoModo: Modo) {
    if (novoModo === modo) return;

    setModo(novoModo);
    setTentativas([]);
    setVenceu(false);
    setDesistiu(false);
    setTimeRevelado(null);
    setPalpiteInput("");
    setTokenPartida(null);
    if (novoModo === "ilimitado") {
      iniciarNovoJogoIlimitado();
    }
  }

  async function enviarPalpite(time: Time) {
    if (modo === "ilimitado" && !tokenPartida) return;
    if (carregando) return;

    setCarregando(true);
    try {
      const res = await fetch("/api/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guess: time.id,
          modo,
          token: modo === "ilimitado" ? tokenPartida : undefined,
        }),
      });
      if (!res.ok) throw new Error(`Servidor respondeu ${res.status}`);
      const resultado: ResultadoComparacao = await res.json();
      setTentativas((prev) => [...prev, { time, resultado }]);
      if (resultado.acertou) setVenceu(true);
      setPalpiteInput("");
    } catch (e) {
      console.error("Falha ao enviar palpite:", e);
    } finally {
      setCarregando(false);
    }
  }

  async function revelarResposta() {
    if (!tokenPartida) return;
    setRevelando(true);
    try {
      const res = await fetch("/api/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenPartida }),
      });
      const data = await res.json();
      if (data.time) {
        setTimeRevelado(data.time);
        setDesistiu(true);
      }
    } catch (e) {
      console.error("Falha ao revelar resposta:", e);
    } finally {
      setRevelando(false);
    }
  }

  const sugestoes = palpiteInput
    ? times
        .filter((t) => normalizar(t.nome).startsWith(normalizar(palpiteInput)))
        .sort((a, b) => normalizar(a.nome).localeCompare(normalizar(b.nome)))
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

      {modo === "ilimitado" && (venceu || desistiu || carregandoNovoJogo) && (
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

      {modo === "ilimitado" && tokenPartida && !venceu && !desistiu && (
        <button
          className="mb-6 text-sm text-zinc-400 underline hover:text-zinc-200 disabled:opacity-50"
          onClick={revelarResposta}
          disabled={revelando || carregando}
        >
          {revelando ? "Revelando..." : "Revelar resposta"}
        </button>
      )}

      {desistiu && timeRevelado && (
        <div className="mb-4 flex items-center justify-center gap-2 text-red-400 font-semibold text-lg">
          <span>O time era</span>
          <img
            src={`/escudos/${timeRevelado.id}.png`}
            alt={timeRevelado.nome}
            title={timeRevelado.nome}
            width={40}
            height={40}
            className="w-10 h-10 object-contain"
          />
          <span>{timeRevelado.nome}</span>
        </div>
      )}

      {!venceu && !desistiu && (modo === "diario" || tokenPartida) && (
        <div className="relative w-full max-w-sm mb-8">
          <input
            className="w-full rounded-lg px-4 py-2 text-black"
            placeholder="Digite o nome do time..."
            value={palpiteInput}
            onChange={(e) => setPalpiteInput(e.target.value)}
            disabled={carregando || carregandoNovoJogo}
          />
          {sugestoes.length > 0 && (
            <ul className="absolute z-10 w-full max-h-60 overflow-y-auto bg-zinc-800 rounded-lg mt-1">
              {sugestoes.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-700 cursor-pointer"
                  onClick={() => enviarPalpite(t)}
                >
                  <img
                    src={`/escudos/${t.id}.png`}
                    alt={t.nome}
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain shrink-0"
                  />
                  <span>{t.nome}</span>
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
        <div className="grid grid-cols-8 gap-2 text-xs font-semibold text-zinc-400 mb-2 min-w-[760px] text-center">
          <span className="px-2">Time</span>
          <span className="px-2">Estado</span>
          <span className="px-2">Região</span>
          <span className="px-2">Fundação</span>
          <span className="px-2">Divisão</span>
          <span className="px-2">Tít. Estaduais</span>
          <span className="px-2">Tít. Nacionais</span>
          <span className="px-2 leading-tight">Tít. Internacionais</span>
        </div>

        {desistiu && timeRevelado && (
          <div className="grid grid-cols-8 gap-2 mb-2 min-w-[760px] items-stretch">
            <span
              className="flex items-center justify-center px-2 min-h-[48px]"
              title={timeRevelado.nome}
            >
              <img
                src={`/escudos/${timeRevelado.id}.png`}
                alt={timeRevelado.nome}
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
              />
            </span>
            <span className={`${CELL_SIZE} bg-green-600 text-white`}>
              {timeRevelado.estado}
            </span>
            <span className={`${CELL_SIZE} bg-green-600 text-white`}>
              {timeRevelado.regiao}
            </span>
            <span className={`${CELL_SIZE} bg-green-600 text-white`}>
              {timeRevelado.fundacao}
            </span>
            <span className={`${CELL_SIZE} bg-green-600 text-white`}>
              {timeRevelado.divisao}
            </span>
            <span className={`${CELL_SIZE} bg-green-600 text-white`}>
              {timeRevelado.titulosEstaduais}
            </span>
            <span className={`${CELL_SIZE} bg-green-600 text-white`}>
              {timeRevelado.titulosNacionais}
            </span>
            <span className={`${CELL_SIZE} bg-green-600 text-white`}>
              {timeRevelado.titulosInternacionais}
            </span>
          </div>
        )}

        {tentativas
          .slice()
          .reverse()
          .map((t, i) => (
            <div
              key={i}
              className="grid grid-cols-8 gap-2 mb-2 min-w-[760px] items-stretch"
            >
              <span
                className="flex items-center justify-center px-2 min-h-[48px]"
                title={t.time.nome}
              >
                <img
                  src={`/escudos/${t.time.id}.png`}
                  alt={t.time.nome}
                  width={40}
                  height={40}
                  className="w-10 h-10 object-contain"
                />
              </span>
              <span
                className={`${CELL_SIZE} ${
                  corStatus[t.resultado.atributos.estado.status]
                }`}
              >
                {t.resultado.atributos.estado.valor}
              </span>
              <span
                className={`${CELL_SIZE} ${
                  corStatus[t.resultado.atributos.regiao.status]
                }`}
              >
                {t.resultado.atributos.regiao.valor}
              </span>
              <span
                className={`${CELL_SIZE} ${
                  corStatus[t.resultado.atributos.fundacao.status]
                }`}
              >
                {t.resultado.atributos.fundacao.valor}
                {seta(t.resultado.atributos.fundacao.direcao)}
              </span>
              <span
                className={`${CELL_SIZE} ${
                  corStatus[t.resultado.atributos.divisao.status]
                }`}
              >
                {t.resultado.atributos.divisao.valor}
              </span>
              <span
                className={`${CELL_SIZE} ${
                  corStatus[t.resultado.atributos.titulosEstaduais.status]
                }`}
              >
                {t.resultado.atributos.titulosEstaduais.valor}
                {seta(t.resultado.atributos.titulosEstaduais.direcao)}
              </span>
              <span
                className={`${CELL_SIZE} ${
                  corStatus[t.resultado.atributos.titulosNacionais.status]
                }`}
              >
                {t.resultado.atributos.titulosNacionais.valor}
                {seta(t.resultado.atributos.titulosNacionais.direcao)}
              </span>
              <span
                className={`${CELL_SIZE} ${
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