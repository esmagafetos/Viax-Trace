import type {
  CondoMap,
  ParsedAddress,
  DeliveryRow,
  RouteResult,
  Quadra,
} from "./types.js";
import { BOUGAINVILLE_III } from "./bougainville-iii.js";

const REGISTRY: Record<string, CondoMap> = {
  [BOUGAINVILLE_III.id]: BOUGAINVILLE_III,
};

const EM_DESENVOLVIMENTO: CondoMap[] = [
  { id: "bougainville-i",        nome: "Bougainville I",        status: "em_desenvolvimento", entrada: { x: 0, y: 0, rotuloEntrada: "" }, quadras: [], ruas: [] },
  { id: "bougainville-ii",       nome: "Bougainville II",       status: "em_desenvolvimento", entrada: { x: 0, y: 0, rotuloEntrada: "" }, quadras: [], ruas: [] },
  { id: "gravata-i",             nome: "Gravatá I",             status: "em_desenvolvimento", entrada: { x: 0, y: 0, rotuloEntrada: "" }, quadras: [], ruas: [] },
  { id: "gravata-ii",            nome: "Gravatá II",            status: "em_desenvolvimento", entrada: { x: 0, y: 0, rotuloEntrada: "" }, quadras: [], ruas: [] },
  { id: "residencial-nova-cal",  nome: "Residencial Nova Califórnia", status: "em_desenvolvimento", entrada: { x: 0, y: 0, rotuloEntrada: "" }, quadras: [], ruas: [] },
];

export function listCondos(): { id: string; nome: string; status: CondoMap["status"]; totalLotes?: number }[] {
  return [
    ...Object.values(REGISTRY),
    ...EM_DESENVOLVIMENTO,
  ].map((c) => ({ id: c.id, nome: c.nome, status: c.status, totalLotes: c.totalLotes }));
}

export function getCondo(id: string): CondoMap | null {
  return REGISTRY[id] ?? EM_DESENVOLVIMENTO.find((c) => c.id === id) ?? null;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const QUADRA_REGEX = /\b(?:q(?:uadra|d)?\.?|qd)\s*0*([0-9]{1,3})\b/i;
const LOTE_REGEX   = /\b(?:l(?:ote|t)?\.?|lt)\s*0*([0-9]{1,4})\b/i;
const ALT_QL_REGEX = /\b0*([0-9]{1,3})\s*[\/\-x]\s*0*([0-9]{1,4})\b/;

export function parseEndereco(endereco: string, condo: CondoMap): ParsedAddress {
  const norm = normalize(endereco);
  let quadra: number | null = null;
  let lote: number | null = null;

  const mQ = endereco.match(QUADRA_REGEX);
  const mL = endereco.match(LOTE_REGEX);
  if (mQ) quadra = parseInt(mQ[1], 10);
  if (mL) lote = parseInt(mL[1], 10);

  if ((quadra === null || lote === null)) {
    const alt = endereco.match(ALT_QL_REGEX);
    if (alt) {
      if (quadra === null) quadra = parseInt(alt[1], 10);
      if (lote === null)   lote   = parseInt(alt[2], 10);
    }
  }

  let ruaCitada: string | null = null;
  for (const r of condo.ruas) {
    const nomes = [r.nome, r.apelido].filter(Boolean) as string[];
    for (const n of nomes) {
      if (norm.includes(normalize(n))) { ruaCitada = r.nome; break; }
    }
    if (ruaCitada) break;
  }

  const condoNorm = normalize(condo.nome);
  const aliases = [condoNorm, condoNorm.replace(/\s+iii?$/, "").trim(), "bougainville"].filter(Boolean);
  const condoCitado = aliases.some((a) => a && norm.includes(a));

  return { quadra, lote, ruaCitada, condoCitado, enderecoOriginal: endereco };
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function instructionFor(
  prev: { x: number; y: number },
  current: Quadra,
  next: Quadra | null
): string {
  if (!next) {
    return `Entregar em Quadra ${current.numero} e finalizar a rota.`;
  }
  const vIn  = { x: current.x - prev.x, y: current.y - prev.y };
  const vOut = { x: next.x - current.x, y: next.y - current.y };
  const cross = vIn.x * vOut.y - vIn.y * vOut.x;
  const dot   = vIn.x * vOut.x + vIn.y * vOut.y;
  const angle = Math.atan2(cross, dot) * (180 / Math.PI);

  let manobra: string;
  if (Math.abs(angle) < 25)      manobra = "siga em frente";
  else if (angle >  25 && angle <= 110)  manobra = "vire à direita";
  else if (angle > 110)                  manobra = "faça o retorno à direita";
  else if (angle < -25 && angle >= -110) manobra = "vire à esquerda";
  else                                   manobra = "faça o retorno à esquerda";

  return `Saindo da Quadra ${current.numero}, ${manobra} em direção à Quadra ${next.numero}.`;
}

export function buildRoute(
  rows: { linha: number; endereco: string }[],
  condo: CondoMap
): RouteResult {
  const t0 = Date.now();
  const detalhes: DeliveryRow[] = [];

  const orderable: { row: DeliveryRow; quadra: Quadra }[] = [];

  for (const r of rows) {
    const parsed = parseEndereco(r.endereco, condo);
    if (parsed.quadra === null || parsed.lote === null) {
      detalhes.push({
        linha: r.linha,
        enderecoOriginal: r.endereco,
        quadra: parsed.quadra,
        lote: parsed.lote,
        classificacao: "nuance",
        motivo: parsed.quadra === null && parsed.lote === null
          ? "Cliente não informou quadra nem lote."
          : parsed.quadra === null
          ? "Cliente não informou a quadra."
          : "Cliente não informou o lote.",
      });
      continue;
    }
    const quadra = condo.quadras.find((q) => q.numero === parsed.quadra);
    if (!quadra) {
      detalhes.push({
        linha: r.linha,
        enderecoOriginal: r.endereco,
        quadra: parsed.quadra,
        lote: parsed.lote,
        classificacao: "nuance",
        motivo: `Quadra ${parsed.quadra} não consta no mapa interno do condomínio.`,
      });
      continue;
    }
    const row: DeliveryRow = {
      linha: r.linha,
      enderecoOriginal: r.endereco,
      quadra: parsed.quadra,
      lote: parsed.lote,
      classificacao: parsed.condoCitado ? "ordenada" : "encontrada_sem_condominio",
      motivo: parsed.condoCitado
        ? "Endereço completo (Quadra/Lote) e condomínio informado."
        : `Endereço encontrado, mas o cliente não informou o nome do condomínio (${condo.nome}).`,
    };
    orderable.push({ row, quadra });
  }

  // Ordenação: nearest-neighbor a partir da entrada
  const visited = new Array(orderable.length).fill(false);
  let cursor = condo.entrada;
  const sequence: { row: DeliveryRow; quadra: Quadra }[] = [];

  while (sequence.length < orderable.length) {
    let bestIdx = -1;
    let bestScore = Infinity;
    for (let i = 0; i < orderable.length; i++) {
      if (visited[i]) continue;
      const item = orderable[i];
      const d = dist(cursor, item.quadra);
      const tieBreaker = item.row.lote ?? 0;
      const score = d * 1000 + tieBreaker;
      if (score < bestScore) { bestScore = score; bestIdx = i; }
    }
    if (bestIdx === -1) break;
    visited[bestIdx] = true;
    sequence.push(orderable[bestIdx]);
    cursor = orderable[bestIdx].quadra;
  }

  let prev: { x: number; y: number } = condo.entrada;
  for (let i = 0; i < sequence.length; i++) {
    const cur = sequence[i];
    const nxt = sequence[i + 1] ?? null;
    cur.row.ordem = i + 1;
    cur.row.instrucao = i === 0
      ? `Saindo da portaria, siga até a Quadra ${cur.quadra.numero} (Lote ${cur.row.lote}).`
      : instructionFor(prev, cur.quadra, nxt?.quadra ?? null) + ` Lote ${cur.row.lote}.`;
    detalhes.push(cur.row);
    prev = cur.quadra;
  }

  detalhes.sort((a, b) => {
    if (a.ordem && b.ordem) return a.ordem - b.ordem;
    if (a.ordem && !b.ordem) return -1;
    if (!a.ordem && b.ordem) return 1;
    return a.linha - b.linha;
  });

  return {
    condominio: { id: condo.id, nome: condo.nome },
    totalLinhas: rows.length,
    totalOrdenadas: detalhes.filter((d) => d.classificacao === "ordenada").length,
    totalSemCondominio: detalhes.filter((d) => d.classificacao === "encontrada_sem_condominio").length,
    totalNuances: detalhes.filter((d) => d.classificacao === "nuance").length,
    detalhes,
    metricas: { tempo_ms: Date.now() - t0 },
  };
}
