const fs = require("fs");
const path = require("path");

const CSV_PATH = path.join(__dirname, "times.csv");
const OUTPUT_PATH = path.join(__dirname, "..", "data", "times.json");

const CAMPOS_NUMERICOS = [
  "fundacao",
  "titulosEstaduais",
  "titulosNacionais",
  "titulosInternacionais",
];

const CAMPOS_CATEGORICOS = ["estado", "regiao", "divisao"];

function normalizarId(nome) {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function parseCSV(texto) {
  const linhas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const cabecalho = linhas[0].split(",").map((c) => c.trim());

  const registros = linhas.slice(1).map((linha, idx) => {
    const valores = [];
    let atual = "";
    let dentroDeAspas = false;

    for (let i = 0; i < linha.length; i++) {
      const char = linha[i];
      if (char === '"') {
        dentroDeAspas = !dentroDeAspas;
      } else if (char === "," && !dentroDeAspas) {
        valores.push(atual.trim());
        atual = "";
      } else {
        atual += char;
      }
    }
    valores.push(atual.trim());

    const registro = {};
    cabecalho.forEach((campo, i) => {
      registro[campo] = valores[i] ?? "";
    });
    registro.__linha = idx + 2;
    return registro;
  });

  return registros;
}

const MAX_CORES = 3;

function parseCores(bruto) {
  const vistas = new Set();
  return bruto
    .split(/[,;]/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase())
    .filter((c) => (vistas.has(c) ? false : vistas.add(c)));
}

function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`Arquivo não encontrado: ${CSV_PATH}`);
    process.exit(1);
  }

  const texto = fs.readFileSync(CSV_PATH, "utf-8");
  const registros = parseCSV(texto);

  const idsVistos = new Set();
  const valoresPorCampo = {};
  const erros = [];
  const times = [];

  for (const reg of registros) {
    const linha = reg.__linha;

    if (!reg.nome) {
      erros.push(`Linha ${linha}: campo "nome" vazio, linha ignorada.`);
      continue;
    }

    const id = normalizarId(reg.nome);
    if (idsVistos.has(id)) {
      erros.push(`Linha ${linha}: id duplicado gerado ("${id}") para "${reg.nome}".`);
      continue;
    }
    idsVistos.add(id);

    const time = { id, nome: reg.nome };

    for (const campo of CAMPOS_CATEGORICOS) {
      const valor = (reg[campo] || "").trim();
      if (!valor) {
        erros.push(`Linha ${linha} (${reg.nome}): campo "${campo}" vazio.`);
      }
      time[campo] = valor;

      if (!valoresPorCampo[campo]) valoresPorCampo[campo] = new Set();
      valoresPorCampo[campo].add(valor);
    }

    time.divisao = (reg.divisao || "").trim();
    if (!valoresPorCampo.divisao) valoresPorCampo.divisao = new Set();
    valoresPorCampo.divisao.add(time.divisao);

    for (const campo of CAMPOS_NUMERICOS) {
      const bruto = (reg[campo] || "").trim();
      const numero = Number(bruto);
      if (bruto === "" || Number.isNaN(numero)) {
        erros.push(`Linha ${linha} (${reg.nome}): campo "${campo}" inválido ("${bruto}").`);
        time[campo] = 0;
      } else {
        time[campo] = numero;
      }
    }

    const cores = parseCores(reg.cores || "");
    if (cores.length === 0) {
      erros.push(`Linha ${linha} (${reg.nome}): campo "cores" vazio.`);
    }
    if (cores.length > MAX_CORES) {
      erros.push(
        `Linha ${linha} (${reg.nome}): ${cores.length} cores informadas, mantendo só as ${MAX_CORES} primeiras.`
      );
    }
    time.cores = cores.slice(0, MAX_CORES);

    if (!valoresPorCampo.cores) valoresPorCampo.cores = new Set();
    time.cores.forEach((c) => valoresPorCampo.cores.add(c));

    times.push(time);
  }

  for (const [campo, valores] of Object.entries(valoresPorCampo)) {
    const lista = Array.from(valores).sort();
    console.log(`  ${campo}: ${lista.join(", ")}`);

    const normalizados = new Map();
    for (const v of lista) {
      const chave = v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (!normalizados.has(chave)) normalizados.set(chave, []);
      normalizados.get(chave).push(v);
    }
    for (const [, variantes] of normalizados) {
      if (variantes.length > 1) {
        erros.push(
          `Possível inconsistência em "${campo}": ${variantes
            .map((v) => `"${v}"`)
            .join(" vs ")} — devem ser exatamente o mesmo texto.`
        );
      }
    }
  }

  if (erros.length > 0) {
    console.log("\nAvisos e erros encontrados:\n");
    erros.forEach((e) => console.log("  - " + e));
    console.log("");
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(times, null, 2), "utf-8");
  console.log(`${times.length} times exportados para ${OUTPUT_PATH}\n`);
}

main();
