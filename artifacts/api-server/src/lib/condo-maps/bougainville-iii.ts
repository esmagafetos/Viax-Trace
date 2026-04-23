import type { CondoMap } from "./types.js";

/**
 * Mapa do Condomínio Residencial Bougainville III (1086 lotes, 52 quadras).
 *
 * Sistema de coordenadas normalizado 0-100 (x: oeste→leste, y: norte→sul).
 * Posições extraídas de fotografias do mapa físico afixado na portaria.
 *
 * Ruas internas identificadas (numeração "Rua Projetada N" + nomes oficiais):
 *   - Av. do Bougainville Branco (RP1) — perímetro sul (avenida principal sul)
 *   - Av. do Bougainville Rosa   (RP2) — paralela interna sul
 *   - Av. do Bougainville Roxo   (RP3) — avenida central horizontal
 *   - Rua da Acácia              (RP4) — horizontal centro-norte
 *   - Rua do Antúrio             (RP5) — extremo norte (triângulo)
 *   - Rua da Azaléia             (RP6) — vertical leste interna
 *   - (RP7 — vias secundárias verticais)
 *   - Rua da Begônia             (RP8) — vertical leste-norte
 *   - Rua da Bromélia            (RP9) — vertical leste-norte
 *   - Rua da Camélia             (RP9 var.) — vertical extremo nordeste
 *   - Rua do Cravo               (RP10) — extremo nordeste (canto superior)
 *   - Rua da Hortênsia           — vertical noroeste
 *   - Rua da Violeta             — vertical nordeste
 *   - Av. do Bougainville Leste  — perímetro leste (onde fica a portaria)
 *
 * Portaria (entrada principal) está no perímetro leste, próximo ao centro-sul,
 * na Avenida do Bougainville Leste.
 */
export const BOUGAINVILLE_III: CondoMap = {
  id: "bougainville-iii",
  nome: "Bougainville III",
  status: "ativo",
  totalLotes: 1086,
  entrada: { x: 96, y: 72, rotuloEntrada: "Portaria — Avenida do Bougainville Leste" },
  ruas: [
    { id: "av-branco",   nome: "Avenida do Bougainville Branco", apelido: "Rua Projetada 1" },
    { id: "av-rosa",     nome: "Avenida do Bougainville Rosa",   apelido: "Rua Projetada 2" },
    { id: "av-roxo",     nome: "Avenida do Bougainville Roxo",   apelido: "Rua Projetada 3" },
    { id: "rp4",         nome: "Rua da Acácia",                  apelido: "Rua Projetada 4" },
    { id: "rp5",         nome: "Rua do Antúrio",                 apelido: "Rua Projetada 5" },
    { id: "rp6",         nome: "Rua da Azaléia",                 apelido: "Rua Projetada 6" },
    { id: "rp7",         nome: "Rua Projetada 7" },
    { id: "rp8",         nome: "Rua da Begônia",                 apelido: "Rua Projetada 8" },
    { id: "rp9",         nome: "Rua da Bromélia",                apelido: "Rua Projetada 9" },
    { id: "rp9b",        nome: "Rua da Camélia",                 apelido: "Rua Projetada 9b" },
    { id: "rp10",        nome: "Rua do Cravo",                   apelido: "Rua Projetada 10" },
    { id: "r-hortensia", nome: "Rua da Hortênsia" },
    { id: "r-violeta",   nome: "Rua da Violeta" },
    { id: "av-leste",    nome: "Avenida do Bougainville Leste" },
  ],
  quadras: [
    // ── Coluna leste (perímetro direito), de baixo para cima junto à portaria ──
    { id: "q1",  numero: 1,  x: 96, y: 88, loteRangeHint: [1, 13] },
    { id: "q2",  numero: 2,  x: 96, y: 80, loteRangeHint: [14, 30] },
    { id: "q3",  numero: 3,  x: 96, y: 60, loteRangeHint: [31, 40] },
    { id: "q4",  numero: 4,  x: 96, y: 48, loteRangeHint: [41, 49] },
    { id: "q5",  numero: 5,  x: 96, y: 32, loteRangeHint: [50, 66] },
    { id: "q6",  numero: 6,  x: 92, y: 14, loteRangeHint: [79, 95] },
    { id: "q7",  numero: 7,  x: 86, y: 6,  loteRangeHint: [67, 78] },

    // ── Segunda coluna leste (lotes 90-200 e 300s no topo) ──
    { id: "q8",  numero: 8,  x: 80, y: 8,  loteRangeHint: [357, 369] },
    { id: "q9",  numero: 9,  x: 90, y: 22, loteRangeHint: [90, 104] },
    { id: "q10", numero: 10, x: 90, y: 38, loteRangeHint: [105, 121] },
    { id: "q11", numero: 11, x: 90, y: 76, loteRangeHint: [199, 218] },
    { id: "q12", numero: 12, x: 90, y: 50, loteRangeHint: [122, 138] },
    { id: "q13", numero: 13, x: 90, y: 28, loteRangeHint: [105, 117] },
    { id: "q14", numero: 14, x: 84, y: 36, loteRangeHint: [122, 149] },
    { id: "q15", numero: 15, x: 78, y: 18, loteRangeHint: [332, 345] },

    // ── Bloco interno leste-superior (lotes 250-360) ──
    { id: "q16", numero: 16, x: 84, y: 50, loteRangeHint: [150, 183] },
    { id: "q17", numero: 17, x: 78, y: 26, loteRangeHint: [286, 301] },
    { id: "q18", numero: 18, x: 88, y: 84, loteRangeHint: [184, 198] },
    { id: "q19", numero: 19, x: 84, y: 78, loteRangeHint: [219, 243] },
    { id: "q20", numero: 20, x: 78, y: 74, loteRangeHint: [400, 415] },
    { id: "q21", numero: 21, x: 74, y: 70, loteRangeHint: [416, 435] },
    { id: "q22", numero: 22, x: 70, y: 66, loteRangeHint: [436, 460] },
    { id: "q23", numero: 23, x: 66, y: 62, loteRangeHint: [461, 480] },
    { id: "q24", numero: 24, x: 72, y: 44, loteRangeHint: [250, 289] },
    { id: "q25", numero: 25, x: 76, y: 22, loteRangeHint: [318, 341] },
    { id: "q26", numero: 26, x: 82, y: 10, loteRangeHint: [360, 369] },

    // ── Bloco central-norte (Rua da Acácia/Antúrio) ──
    { id: "q27", numero: 27, x: 56, y: 54, loteRangeHint: [481, 500] },
    { id: "q28", numero: 28, x: 50, y: 56, loteRangeHint: [497, 514] },
    { id: "q29", numero: 29, x: 44, y: 58, loteRangeHint: [515, 540] },
    { id: "q30", numero: 30, x: 38, y: 60, loteRangeHint: [541, 580] },

    // ── Strip sul (Avenida do Bougainville Branco), oeste→leste ──
    { id: "q31", numero: 31, x: 78, y: 96, loteRangeHint: [199, 215] },
    { id: "q32", numero: 32, x: 70, y: 96, loteRangeHint: [219, 247] },
    { id: "q33", numero: 33, x: 62, y: 90, loteRangeHint: [596, 631] },
    { id: "q34", numero: 34, x: 54, y: 96, loteRangeHint: [435, 470] },
    { id: "q35", numero: 35, x: 46, y: 90, loteRangeHint: [681, 716] },
    { id: "q36", numero: 36, x: 38, y: 90, loteRangeHint: [681, 696] },
    { id: "q37", numero: 37, x: 30, y: 90, loteRangeHint: [766, 784] },
    { id: "q38", numero: 38, x: 22, y: 88, loteRangeHint: [741, 766] },
    { id: "q39", numero: 39, x: 18, y: 96, loteRangeHint: [535, 556] },
    { id: "q40", numero: 40, x: 32, y: 70, loteRangeHint: [612, 628] },

    // ── Triângulo noroeste (Rua do Antúrio + Rua da Acácia) ──
    { id: "q41", numero: 41, x: 22, y: 60, loteRangeHint: [731, 765] },
    { id: "q42", numero: 42, x: 24, y: 44, loteRangeHint: [851, 870] },
    { id: "q43", numero: 43, x: 22, y: 48, loteRangeHint: [871, 890] },
    { id: "q44", numero: 44, x: 26, y: 50, loteRangeHint: [891, 910] },
    { id: "q45", numero: 45, x: 18, y: 78, loteRangeHint: [925, 945] },
    { id: "q46", numero: 46, x: 14, y: 66, loteRangeHint: [977, 1004] },
    { id: "q47", numero: 47, x: 14, y: 80, loteRangeHint: [951, 973] },
    { id: "q48", numero: 48, x: 10, y: 64, loteRangeHint: [977, 1006] },
    { id: "q49", numero: 49, x: 10, y: 72, loteRangeHint: [999, 1022] },
    { id: "q50", numero: 50, x: 8,  y: 76, loteRangeHint: [1067, 1080] },
    { id: "q51", numero: 51, x: 8,  y: 84, loteRangeHint: [1023, 1062] },
    { id: "q52", numero: 52, x: 6,  y: 92, loteRangeHint: [1063, 1086] },
  ],
  observacoes:
    "Mapeamento extraído de fotografias do mapa físico (10 ângulos). 52 quadras, 1086 lotes, 14 vias internas nomeadas. Posições aproximadas — calibração fina pode ser feita ajustando coordenadas (x,y) por quadra com base em testes reais de rota.",
};
