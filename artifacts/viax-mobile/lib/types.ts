export type User = {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  birthDate: string | null;
  createdAt: string;
};

export type DashboardSummary = {
  totalAnalyses: number;
  totalAddressesProcessed: number;
  avgNuanceRate: number;
  avgGeocodeSuccess: number;
  avgSimilarity: number;
  analysesThisMonth: number;
};

export type RecentAnalysis = {
  id: number;
  fileName: string;
  totalAddresses: number;
  nuances: number;
  status: string;
  createdAt: string;
};

export type FinancialDay = {
  data: string;
  rotas: number;
  receita: number;
};

export type FinancialSummary = {
  rotasCicloAtual: number;
  receitaEstimada: number;
  despesasFixas: number;
  lucroBruto: number;
  metaRotas: number | null;
  percentualMeta: number | null;
  valorPorRota: number | null;
  cicloPagamentoDias: number;
  inicioDoCliclo: string;
  fimDoCiclo: string;
  graficoDiario: FinancialDay[];
};

export type Analysis = {
  id: number;
  fileName: string;
  totalAddresses: number;
  nuances: number;
  geocodeSuccess: number;
  similarityAvg: number;
  processingTimeMs: number;
  parserMode: string;
  status: string;
  createdAt: string;
};

export type AnalysisListResponse = {
  items: Analysis[];
  total: number;
  page: number;
  limit: number;
};

export type ParserMode = "builtin" | "ai";
export type InstanceMode = "builtin" | "geocodebr" | "googlemaps";
export type AiProvider = "openai" | "anthropic" | "google" | "" | null;

export type UserSettings = {
  parserMode: ParserMode;
  aiProvider: AiProvider;
  aiApiKey: string | null;
  toleranceMeters: number;
  instanceMode: InstanceMode;
  googleMapsApiKey: string | null;
  valorPorRota: number | null;
  cicloPagamentoDias: number;
  metaMensalRotas: number | null;
  despesasFixasMensais: number | null;
};

export type CondoStatus = "ativo" | "em_desenvolvimento";

export type Condominium = {
  id: string;
  nome: string;
  status: CondoStatus;
  totalLotes?: number;
};

export type SSEStep = { step: string; progress?: number };
export type SSEError = { error: string };

/** Result row from POST /process/upload (route auditing) */
export type ProcessResultRow = {
  linha: number;
  endereco_original: string;
  nome_rua_extraido: string | null;
  nome_rua_oficial: string | null;
  similaridade: number | null;
  is_nuance: boolean;
  motivo: string;
  poi_estruturado: string | null;
  distancia_metros: number | null;
  tipo_endereco: string;
};

export type ProcessResult = {
  total_enderecos: number;
  total_nuances: number;
  percentual_problema: number;
  detalhes: ProcessResultRow[];
  metricas_tecnicas: {
    tempo_processamento_ms: number;
    taxa_geocode_sucesso: number;
    instancia: string;
    parser?: string;
    tolerancia_metros?: number;
  };
};

/** Result row from POST /condominium/process (sequencing) */
export type CondoClassificacao = "ordenada" | "encontrada_sem_condominio" | "nuance" | string;

export type CondoResultRow = {
  linha: number;
  enderecoOriginal: string;
  quadra: string | null;
  lote: string | null;
  classificacao: CondoClassificacao;
  motivo: string;
  ordem: number | null;
  instrucao: string | null;
};

export type CondoResult = {
  condominio: { id: string; nome: string };
  totalLinhas: number;
  totalOrdenadas: number;
  totalSemCondominio: number;
  totalNuances: number;
  detalhes: CondoResultRow[];
  metricas: {
    tempo_ms: number;
  };
};
