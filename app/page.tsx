"use client";

import { ReactNode, useState, useEffect } from "react";
import timesData from "@/data/times.json";
import { ResultadoComparacao, StatusAtributo, Time } from "@/lib/types";
import { indiceDoDia } from "@/lib/time-do-dia";

const times = timesData as Time[];

type Modo = "diario" | "ilimitado";
type Atributos = ResultadoComparacao["atributos"];
type Tentativa = { time: Time; resultado: ResultadoComparacao };

const corStatus: Record<StatusAtributo, string> = {
  correto: "bg-green-600 text-white",
  parcial: "bg-yellow-500 text-white",
  errado: "bg-zinc-700 text-zinc-200",
};

const GRID = "grid grid-cols-9 gap-2 min-w-[900px]";

const CELULA =
  "rounded px-2 py-2 text-center text-sm min-h-[56px] min-w-0 flex items-center justify-center whitespace-nowrap overflow-hidden text-ellipsis";

const COLUNAS = [
  "Time",
  "Estado",
  "Região",
  "Fundação",
  "Divisão",
  "Cores",
  "Tít. Estaduais",
  "Tít. Nacionais",
  "Tít. Internacionais",
];

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
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function nomeCorresponde(nome: string, busca: string): boolean {
  const nomeNorm = normalizar(nome);
  const buscaNorm = normalizar(busca);
  if (!buscaNorm) return false;
  if (nomeNorm.startsWith(buscaNorm)) return true;
  return nomeNorm.split(" ").some((p) => p.startsWith(buscaNorm));
}

function rankBusca(nome: string, busca: string): number {
  return normalizar(nome).startsWith(normalizar(busca)) ? 0 : 1;
}

function tentativaValida(item: unknown): item is Tentativa {
  if (!item || typeof item !== "object") return false;
  const { time, resultado } = item as {
    time?: Partial<Time>;
    resultado?: Partial<ResultadoComparacao>;
  };
  return (
    !!time &&
    typeof time.id === "string" &&
    typeof time.nome === "string" &&
    !!resultado?.atributos?.cores
  );
}

function atributosDoTimeRevelado(t: Time): Atributos {
  return {
    estado: { valor: t.estado, status: "correto" },
    regiao: { valor: t.regiao, status: "correto" },
    fundacao: { valor: t.fundacao, status: "correto" },
    divisao: { valor: t.divisao, status: "correto" },
    cores: { valor: t.cores ?? [], status: "correto" },
    titulosEstaduais: { valor: t.titulosEstaduais, status: "correto" },
    titulosNacionais: { valor: t.titulosNacionais, status: "correto" },
    titulosInternacionais: { valor: t.titulosInternacionais, status: "correto" },
  };
}

function Celula({
  status,
  children,
}: {
  status: StatusAtributo;
  children: ReactNode;
}) {
  return <span className={`${CELULA} ${corStatus[status]}`}>{children}</span>;
}

function LinhaAtributos({
  time,
  atributos,
}: {
  time: Time;
  atributos: Atributos;
}) {
  return (
    <div className={`${GRID} mb-2 items-stretch`}>
      <span
        className="flex items-center justify-center px-2 min-h-[56px]"
        title={time.nome}
      >
        <img
          src={`/escudos/${time.id}.png`}
          alt={time.nome}
          width={40}
          height={40}
          className="w-10 h-10 object-contain"
        />
      </span>

      <Celula status={atributos.estado.status}>{atributos.estado.valor}</Celula>
      <Celula status={atributos.regiao.status}>{atributos.regiao.valor}</Celula>
      <Celula status={atributos.fundacao.status}>
        {atributos.fundacao.valor}
        {seta(atributos.fundacao.direcao)}
      </Celula>
      <Celula status={atributos.divisao.status}>{atributos.divisao.valor}</Celula>

      <span
        className={`${CELULA} ${corStatus[atributos.cores.status]} flex-col text-xs leading-tight py-1`}
      >
        {atributos.cores.valor.map((cor) => (
          <span key={cor}>{cor}</span>
        ))}
      </span>

      <Celula status={atributos.titulosEstaduais.status}>
        {atributos.titulosEstaduais.valor}
        {seta(atributos.titulosEstaduais.direcao)}
      </Celula>
      <Celula status={atributos.titulosNacionais.status}>
        {atributos.titulosNacionais.valor}
        {seta(atributos.titulosNacionais.direcao)}
      </Celula>
      <Celula status={atributos.titulosInternacionais.status}>
        {atributos.titulosInternacionais.valor}
        {seta(atributos.titulosInternacionais.direcao)}
      </Celula>
    </div>
  );
}

export default function Home() {
  const [modo, setModo] = useState<Modo>("diario");
  const [palpiteInput, setPalpiteInput] = useState("");
  const [tentativas, setTentativas] = useState<Tentativa[]>([]);
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

    const chave = `dailyAttempts_${diaAtual}`;
    const salvo = localStorage.getItem(chave);

    if (salvo) {
      try {
        const bruto: unknown[] = JSON.parse(salvo);
        const validas = bruto.filter(tentativaValida);

        if (validas.length !== bruto.length) {
          console.warn("Tentativas salvas em formato antigo foram descartadas.");
          localStorage.removeItem(chave);
          setTentativas([]);
          setVenceu(false);
        } else {
          setTentativas(validas);
          setVenceu(validas.some((t) => t.resultado.acertou));
        }
      } catch (e) {
        console.error("Falha ao ler tentativas salvas:", e);
        localStorage.removeItem(chave);
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
    if (tentativas.some((t) => t.time.id === time.id)) return;

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

  const idsUsados = new Set(tentativas.map((t) => t.time.id));

  const sugestoes = palpiteInput
    ? times
        .filter((t) => nomeCorresponde(t.nome, palpiteInput))
        .filter((t) => !idsUsados.has(t.id))
        .sort((a, b) => {
          const rankA = rankBusca(a.nome, palpiteInput);
          const rankB = rankBusca(b.nome, palpiteInput);
          if (rankA !== rankB) return rankA - rankB;
          return normalizar(a.nome).localeCompare(normalizar(b.nome));
        })
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

      <div className="w-full max-w-5xl overflow-x-auto">
        <div
          className={`${GRID} text-xs font-semibold text-zinc-400 mb-2 text-center`}
        >
          {COLUNAS.map((coluna) => (
            <span key={coluna} className="px-2 leading-tight">
              {coluna}
            </span>
          ))}
        </div>

        {desistiu && timeRevelado && (
          <LinhaAtributos
            time={timeRevelado}
            atributos={atributosDoTimeRevelado(timeRevelado)}
          />
        )}

        {tentativas
          .slice()
          .reverse()
          .map((t, i) => (
            <LinhaAtributos
              key={`${t.time.id}-${i}`}
              time={t.time}
              atributos={t.resultado.atributos}
            />
          ))}
      </div>
    </main>
  );
}