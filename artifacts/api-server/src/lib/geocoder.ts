import { logger } from "./logger.js";

const USER_AGENT = "ViaX-Scout/7.0 (viax-scout-br)";
const NOMINATIM_INSTANCES = [
  "https://nominatim.openstreetmap.org",
  "https://nominatim.geocoding.ai",
];
const SIMILARITY_THRESHOLD_DEFAULT = 0.68;
const SIMILARITY_THRESHOLD_AVENIDA = 0.92;

// Padrões de avenidas extensas que exigem alta precisão
const AVENIDAS_EXTENSAS_REGEX = /\b(beira[\s-]?mar|beira[\s-]?rio|beira[\s-]?lago|independ[eê]ncia|presidente|marechal|general|brasil|rep[uú]blica|get[uú]lio\s+vargas|jo[aã]o\s+pessoa|santos\s+dumont|dom\s+pedro|princesa\s+isabel|sete\s+de\s+setembro)\b/i;

// Palavras que indicam endereço comercial / POI
const PALAVRAS_COMERCIO_REGEX = /\b(agência|agencia|loja|mercado|supermercado|hipermercado|farmácia|farmacia|drogaria|posto|banco|caixa|correios|hospital|clínica|clinica|posto\s+de\s+saúde|posto\s+de\s+saude|escola|colégio|colegio|faculdade|universidade|shopping|centro\s+comercial|academia|salão|salao|barbearia|padaria|restaurante|bar|hotel|pousada|condomínio|condominio|edifício|edificio|residencial|conjunto)\b/i;

export interface GeoResult {
  rua: string;
  lat?: number;
  lon?: number;
}

export interface ParsedAddress {
  rua_principal: string;
  numero: string;
  km_rodovia: number | null;
  via_secundaria: string | null;
  poi: string;
  cidade: string;
  bairro: string;
  cep: string | null;
  is_comercio: boolean;
  is_avenida_extensa: boolean;
}

export interface NuanceResult {
  is_nuance: boolean;
  similaridade: number | null;
  motivo: string;
}

export interface AddressRow {
  linha: number;
  endereco: string;
  lat: number | null;
  lon: number | null;
  cidade: string;
  bairro: string;
  cep?: string;
}

export interface ResultRow {
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
}

function normalizarTexto(texto: string): string {
  texto = texto.toLowerCase();
  texto = texto
    .replace(/\b(av|avda|aven)\b\.?/gi, "avenida")
    .replace(/\b(tv|trav)\b\.?/gi, "travessa")
    .replace(/\b(rod|rovia)\b\.?/gi, "rodovia")
    .replace(/\bpç?a\b\.?/gi, "praca")
    .replace(/\bdezoito\b/gi, "18")
    .replace(/\bdezessete\b/gi, "17")
    .replace(/\bdezesseis\b/gi, "16")
    .replace(/\bquinze\b/gi, "15")
    .replace(/\bcatorze\b/gi, "14")
    .replace(/\btreze\b/gi, "13")
    .replace(/\bdoze\b/gi, "12")
    .replace(/\bonze\b/gi, "11")
    .replace(/\bdez\b/gi, "10")
    .replace(/\bnove\b/gi, "9")
    .replace(/\boito\b/gi, "8")
    .replace(/\bsete\b/gi, "7")
    .replace(/\bseis\b/gi, "6")
    .replace(/\bcinco\b/gi, "5")
    .replace(/\bquatro\b/gi, "4")
    .replace(/\btres\b/gi, "3")
    .replace(/\btrês\b/gi, "3")
    .replace(/\bdois\b/gi, "2")
    .replace(/\bum\b/gi, "1");
  texto = texto.replace(/[^\p{L}\p{N}\s]/gu, "");
  texto = texto.replace(/\s+/g, " ").trim();
  const mapa: Record<string, string> = {
    à: "a", á: "a", â: "a", ã: "a", ä: "a",
    è: "e", é: "e", ê: "e", ë: "e",
    ì: "i", í: "i", î: "i", ï: "i",
    ò: "o", ó: "o", ô: "o", õ: "o", ö: "o",
    ù: "u", ú: "u", û: "u", ü: "u",
    ç: "c", ñ: "n",
  };
  return texto.split("").map((c) => mapa[c] ?? c).join("");
}

function normalizarNomeRua(texto: string): string {
  const tiposRua = /^(rua|r|av|avenida|alameda|estrada|rodovia|rovia|viela|beco|largo|praca|praça|pca|travessa|trav|tv|passagem)\s+/i;
  return normalizarTexto(texto)
    .replace(tiposRua, "")
    .split(" ")
    .filter((w) => w && !["de", "da", "do", "das", "dos", "a", "o", "e"].includes(w))
    .join(" ");
}

function calcularSimilaridade(str1: string, str2: string): number {
  const a = normalizarNomeRua(str1);
  const b = normalizarNomeRua(str2);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) {
    const menor = Math.min(a.length, b.length);
    const maior = Math.max(a.length, b.length);
    if (menor >= 5) return Math.max(0.82, menor / maior);
  }
  // Jaccard de bigramas + presença de palavras
  const bigramas = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s[i] + s[i + 1]);
    return set;
  };
  const ba = bigramas(a);
  const bb = bigramas(b);
  const inter = [...ba].filter((x) => bb.has(x)).length;
  const union = new Set([...ba, ...bb]).size;
  const jaccard = union === 0 ? 0 : inter / union;
  // Verificação de palavras principais (ignoring tipo de logradouro)
  const tiposRua = /^(rua|r|av|avenida|alameda|estrada|rodovia|rovia|viela|beco|largo|praça|pca|travessa|trav|tv|passagem)\s+/i;
  const a2 = a.replace(tiposRua, "");
  const b2 = b.replace(tiposRua, "");
  const palavrasA = a2.split(" ").filter(Boolean);
  const palavrasB = new Set(b2.split(" ").filter(Boolean));
  const palavrasComuns = palavrasA.filter((w) => palavrasB.has(w)).length;
  const palavraScore = palavrasA.length > 0 ? palavrasComuns / Math.max(palavrasA.length, palavrasB.size) : 0;
  return Math.max(jaccard, palavraScore);
}

function limiarAdaptativo(extraida: string, isAvenidaExtensa: boolean, isComercioPOI: boolean): number {
  if (isAvenidaExtensa || isComercioPOI) return SIMILARITY_THRESHOLD_AVENIDA;
  const len = extraida.length;
  if (len < 5) return 0.85;
  if (len < 10) return 0.78;
  return SIMILARITY_THRESHOLD_DEFAULT;
}

function extrairCEP(texto: string): string | null {
  const m = texto.match(/\b(\d{5}-?\d{3})\b/);
  if (m) return m[1].replace(/[^0-9]/g, "");
  return null;
}

function extrairNumero(endereco: string): string {
  const m = endereco.match(/[,\s]+(\d+[A-Za-z]?|s\/?n|sn)\b/i);
  if (m) return m[1].toUpperCase();
  return "";
}

function extrairKmRodovia(endereco: string): number | null {
  const m = endereco.match(/\bkm\s*(\d+(?:[.,]\d+)?)/i);
  if (m) return parseFloat(m[1].replace(",", "."));
  return null;
}

function removerAnotacoesMotorista(s: string): string {
  const idx = s.indexOf(" - ");
  if (idx !== -1) s = s.substring(0, idx);
  s = s.replace(/\s+\d+[°ªº].*$/u, "");
  const gatilhos = ["proximo", "próximo", "perto", "referencia", "referência", "maps", "google",
    "waze", "placas", "portao", "portão", "buzina", "frente", "fundos", "esquina", "atrás", "atras", "entre", "deixar", "nao entregar", "não entregar"];
  const lower = s.toLowerCase();
  for (const g of gatilhos) {
    const pos = lower.indexOf(g);
    if (pos !== -1 && pos > 5) {
      s = s.substring(0, pos).trim();
      break;
    }
  }
  return s;
}

function extrairLogradouroPrincipal(endereco: string): string {
  const limpo = endereco.replace(/\bRovia\b/gi, "Rodovia");
  const m = limpo.match(/\b(?:Rua|R\.?|Av\.?|Avenida|Alameda|Praça|Pça\.?|Travessa|Trav\.?|Tv\.?|Estrada|Rod\.?|Rodovia|Viela|Beco|Passagem|Largo)\s+[^\s,.\d][^,.;\n\r]*/iu);
  if (m) {
    return m[0]
      .replace(/\s+\b(?:proximo|próximo|perto|refer[eê]ncia|maps|google|waze|placas|port[aã]o|buzina|frente|fundos|esquina|entre|deixar)\b.*$/iu, "")
      .trim();
  }
  const semLoteamento = limpo.replace(/^\s*(Loteamento|Condomínio|Residencial|Conjunto|Núcleo)\s+[^,]+?[,]?\s*/i, "");
  const m2 = semLoteamento.match(/^([^,\d]+)/);
  if (m2) {
    const candidato = m2[1].trim();
    if (candidato.length >= 4 && !/^(lote|quadra|qd|lt|casa|apto|apartamento|bloco|conjunto|residencial|condomínio|nº|bairro)$/i.test(candidato)) {
      return candidato;
    }
  }
  return "";
}

function extrairViaSecundaria(endereco: string): string | null {
  // Formatos: "Travessa B", "Tv B", "Passagem 3", "Viela X"
  const m = endereco.match(/[,\s]+((?:travessa|trav\.?|tv\.?|passagem|psg\.?|viela|beco)\s*\.?\s*[A-Za-z0-9][^,]{0,30})/i);
  if (m) return m[1].trim();
  return null;
}

function extrairPOI(endereco: string): string {
  let sem = endereco.replace(/^\s*(?:Rua|Av\.?|Avenida|Alameda|Praça|Pça\.?|Travessa|Tv\.?|Estrada|Rod\.?|Rodovia|Viela|Beco|Passagem|Largo)\s+[^,]+/iu, "");
  sem = sem.replace(/^[,\s]+\d*[,\s]*/u, "");
  sem = sem.replace(/^\s*(loja|apt\.?|apto\.?)\s+/iu, "");
  sem = sem.replace(/\b(travessa|trav\.?|tv\.?|passagem)\s*\.?\s*\d*[A-Za-z]*/iu, "");
  sem = sem.replace(/^[\s\t\n\r,()]+|[\s\t\n\r,()]+$/g, "");
  if (sem.length >= 3 && !/^\d+$/.test(sem) && !/^[A-Z]\d*$/i.test(sem)) return sem;
  return "";
}

function extrairCidadeDoEndereco(endereco: string): string {
  const m = endereco.match(/[,]\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)\s*[,]?\s*[A-Z]{2}\b/);
  if (m) return m[1].trim();
  return "";
}

function normalizarAcronimos(texto: string): string {
  texto = texto.replace(/\b(Lot|LT|L)[\s:]*(\d+[A-Z]?)\b/gi, "Lote $2");
  texto = texto.replace(/\b(Qua?|QD|Quad)[\s:]*(\d+)\b/gi, "Quadra $2");
  texto = texto.replace(/\b(Cs\.?|C)[\s:]*(\d+[A-Z]?)\b/gi, "Casa $2");
  texto = texto.replace(/\b(Lj\.?|Lj)[\s:]*(\d+[A-Z]?)\b/gi, "Loja $2");
  texto = texto.replace(/\b(Bl\.?|BL)\s+([A-Z])\b/gi, "Bloco $2");
  texto = texto.replace(/\b(Apt\.?|Apto\.?)\s+(\d+[A-Z]?)\b/gi, "Apto. $2");
  texto = texto.replace(/\bRovia\b/gi, "Rodovia");
  return texto;
}

function extrairRefsEstruturadas(texto: string): string | null {
  const refs: string[] = [];
  if (/Quadra\s+(\d+)/i.test(texto)) refs.push("Quadra " + texto.match(/Quadra\s+(\d+)/i)![1]);
  if (/Lote\s+([A-Z0-9]+)/i.test(texto)) refs.push("Lote " + texto.match(/Lote\s+([A-Z0-9]+)/i)![1]);
  if (/Casa\s+(\d+[A-Z]?)/i.test(texto)) refs.push("Casa " + texto.match(/Casa\s+(\d+[A-Z]?)/i)![1]);
  if (/Bloco\s+([A-Z]+)/i.test(texto)) refs.push("Bloco " + texto.match(/Bloco\s+([A-Z]+)/i)![1]);
  return refs.length > 0 ? refs.join(", ") : null;
}

export function parsearEndereco(endereco: string, cidade = "", bairro = "", cepLinha = ""): ParsedAddress {
  let end = endereco.replace(/\s+/g, " ").trim();
  end = removerAnotacoesMotorista(end);
  end = normalizarAcronimos(end);
  const rua = extrairLogradouroPrincipal(end);
  const poi = extrairPOI(end);
  const cep = extrairCEP(end) ?? (cepLinha ? cepLinha.replace(/\D/g, "") : null);
  return {
    rua_principal: rua,
    numero: extrairNumero(end),
    km_rodovia: extrairKmRodovia(end),
    via_secundaria: extrairViaSecundaria(end),
    poi,
    poi_estruturado: extrairRefsEstruturadas(end),
    cidade: cidade || extrairCidadeDoEndereco(end),
    bairro,
    cep,
    is_comercio: PALAVRAS_COMERCIO_REGEX.test(poi) || PALAVRAS_COMERCIO_REGEX.test(end),
    is_avenida_extensa: AVENIDAS_EXTENSAS_REGEX.test(rua) || AVENIDAS_EXTENSAS_REGEX.test(end),
  } as any;
}

async function httpGet(url: string, timeout = 10000): Promise<any> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept": "application/json" },
      signal: AbortSignal.timeout(timeout),
    });
    if (!resp.ok) {
      logger.debug({ url, status: resp.status }, "HTTP request failed");
      return null;
    }
    return await resp.json();
  } catch (err: any) {
    logger.debug({ url, error: err?.message }, "HTTP fetch error");
    return null;
  }
}

async function aguardarRateLimit(ultimaReq: number): Promise<number> {
  const agora = Date.now();
  const diff = agora - ultimaReq;
  if (diff < 1100) await new Promise((r) => setTimeout(r, 1100 - diff));
  return Date.now();
}

function extrairDadosNominatim(data: any): GeoResult | null {
  const addr = data?.address ?? {};
  const campos = ["road", "pedestrian", "footway", "cycleway", "path", "street", "residential"];
  for (const c of campos) {
    if (addr[c]) {
      return {
        rua: String(addr[c]).trim(),
        lat: data.lat ? parseFloat(data.lat) : undefined,
        lon: data.lon ? parseFloat(data.lon) : undefined,
      };
    }
  }
  // Fallback: nome do display para POIs
  if (data.display_name && data.lat && data.lon) {
    const partes = data.display_name.split(",");
    return {
      rua: partes[0]?.trim() ?? "",
      lat: parseFloat(data.lat),
      lon: parseFloat(data.lon),
    };
  }
  return null;
}

export function haversineMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dL = ((lat2 - lat1) * Math.PI) / 180;
  const dO = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dL / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dO / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function geocodeBrasilAPI(cep: string): Promise<{ rua: string; cidade: string; bairro: string } | null> {
  const limpo = cep.replace(/\D/g, "");
  if (limpo.length !== 8) return null;
  logger.debug({ cep: limpo }, "geocodeBrasilAPI call");
  const data = await httpGet(`https://brasilapi.com.br/api/cep/v1/${limpo}`);
  if (!data?.street) return null;
  return {
    rua: data.street.replace(/\b\w/g, (c: string) => c.toUpperCase()),
    cidade: data.city ?? "",
    bairro: data.neighborhood ?? "",
  };
}

export async function geocodeForwardNominatim(
  query: string,
  ultimaReq: number
): Promise<{ result: GeoResult | null; ultimaReq: number }> {
  let newUltimaReq = ultimaReq;
  const viewbox = "-74.0,-34.8,-34.8,5.3";
  logger.debug({ query }, "geocodeForwardNominatim");

  for (const base of NOMINATIM_INSTANCES) {
    newUltimaReq = await aguardarRateLimit(newUltimaReq);
    const url = `${base}/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&viewbox=${viewbox}&bounded=1&countrycodes=br&accept-language=pt-BR`;
    const data = await httpGet(url);
    if (!data || !Array.isArray(data)) continue;
    for (const item of data) {
      const result = extrairDadosNominatim(item);
      if (result && result.rua.length > 3) {
        logger.debug({ query, found: result.rua, lat: result.lat, lon: result.lon }, "Nominatim forward hit");
        return { result, ultimaReq: newUltimaReq };
      }
    }
  }

  // Fallback Photon
  const photon = await httpGet(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=pt&osm_tag=highway`);
  if (photon?.features?.length > 0) {
    for (const f of photon.features) {
      const rua = f.properties?.street ?? f.properties?.name;
      if (rua && rua.length > 3) {
        logger.debug({ query, found: rua }, "Photon fallback hit");
        return {
          result: { rua, lat: f.geometry?.coordinates?.[1], lon: f.geometry?.coordinates?.[0] },
          ultimaReq: newUltimaReq,
        };
      }
    }
  }

  logger.debug({ query }, "Forward geocode: no result");
  return { result: null, ultimaReq: newUltimaReq };
}

export async function geocodeForwardPOI(
  poi: string,
  rua: string,
  cidade: string,
  ultimaReq: number
): Promise<{ result: GeoResult | null; ultimaReq: number }> {
  const query = [poi, rua, cidade, "Brasil"].filter(Boolean).join(", ");
  logger.debug({ poi, rua, cidade }, "geocodeForwardPOI");
  let newUltimaReq = await aguardarRateLimit(ultimaReq);
  const viewbox = "-74.0,-34.8,-34.8,5.3";

  for (const base of NOMINATIM_INSTANCES) {
    const url = `${base}/search?format=json&q=${encodeURIComponent(query)}&limit=3&addressdetails=1&viewbox=${viewbox}&bounded=1&accept-language=pt-BR`;
    const data = await httpGet(url);
    if (!data || !Array.isArray(data)) continue;
    for (const item of data) {
      if (item.lat && item.lon) {
        logger.debug({ poi, found: item.display_name }, "POI geocode hit");
        return {
          result: {
            rua: (item.address?.road ?? item.address?.name ?? item.display_name?.split(",")[0] ?? poi).trim(),
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          },
          ultimaReq: newUltimaReq,
        };
      }
    }
    newUltimaReq = await aguardarRateLimit(newUltimaReq);
  }

  return { result: null, ultimaReq: newUltimaReq };
}

export async function geocodeViaSecundaria(
  viaSecundaria: string,
  cidade: string,
  bairro: string,
  ultimaReq: number
): Promise<{ result: GeoResult | null; ultimaReq: number }> {
  const query = [viaSecundaria, bairro, cidade, "Brasil"].filter(Boolean).join(", ");
  logger.debug({ viaSecundaria, query }, "geocodeViaSecundaria");
  return geocodeForwardNominatim(query, ultimaReq);
}

export async function geocodeReverseNominatim(
  lat: number,
  lon: number,
  ultimaReq: number
): Promise<{ result: GeoResult | null; ultimaReq: number }> {
  const newUltimaReq = await aguardarRateLimit(ultimaReq);
  const url = `${NOMINATIM_INSTANCES[0]}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=pt-BR&layer=address`;
  logger.debug({ lat, lon }, "geocodeReverseNominatim");
  const data = await httpGet(url);
  if (!data) return { result: null, ultimaReq: newUltimaReq };
  const result = extrairDadosNominatim(data);
  logger.debug({ lat, lon, found: result?.rua }, "Reverse geocode result");
  return { result, ultimaReq: newUltimaReq };
}

export async function geocodeReversePhoton(lat: number, lon: number): Promise<GeoResult | null> {
  const data = await httpGet(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&radius=0.15&lang=pt`);
  const features = Array.isArray(data?.features) ? data.features : [];
  for (const f of features) {
    const props = f.properties ?? {};
    const rua = props.street ?? props.name;
    if (rua && String(rua).trim().length > 3) {
      return {
        rua: String(rua).trim(),
        lat: f.geometry?.coordinates?.[1],
        lon: f.geometry?.coordinates?.[0],
      };
    }
  }
  return null;
}

export async function geocodeGoogleMaps(query: string, apiKey: string): Promise<GeoResult | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&language=pt-BR&region=BR`;
  logger.debug({ query }, "geocodeGoogleMaps");
  const data = await httpGet(url);
  if (data?.status !== "OK" || !data?.results?.[0]) {
    logger.debug({ query, status: data?.status }, "Google Maps: no result");
    return null;
  }
  const result = data.results[0];
  const components = result.address_components ?? [];
  const routeComp = components.find((c: any) => c.types.includes("route"));
  if (!routeComp) return null;
  return {
    rua: routeComp.long_name,
    lat: result.geometry?.location?.lat,
    lon: result.geometry?.location?.lng,
  };
}

export async function geocodeGoogleMapsReverse(lat: number, lon: number, apiKey: string): Promise<GeoResult | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${apiKey}&language=pt-BR&region=BR&result_type=street_address|route|premise`;
  logger.debug({ lat, lon }, "geocodeGoogleMapsReverse");
  const data = await httpGet(url);
  if (data?.status !== "OK" || !Array.isArray(data?.results)) {
    logger.debug({ status: data?.status }, "Google Maps reverse: no result");
    return null;
  }
  for (const result of data.results) {
    const components = result.address_components ?? [];
    const routeComp = components.find((c: any) => c.types.includes("route"));
    if (routeComp) {
      return {
        rua: routeComp.long_name,
        lat: result.geometry?.location?.lat,
        lon: result.geometry?.location?.lng,
      };
    }
  }
  return null;
}

async function parseAddressWithAI(
  endereco: string,
  aiProvider: string,
  aiApiKey: string
): Promise<Partial<ParsedAddress> | null> {
  logger.debug({ provider: aiProvider, endereco }, "AI parser call");

  const prompt = `Você é um parser de endereços brasileiros. Extraia os componentes do seguinte endereço e retorne JSON APENAS com os campos abaixo (sem explicação):
{
  "rua_principal": "nome do logradouro principal exatamente como rua/avenida/estrada/rodovia, ignorando lote, quadra, loja, casa e referências do motorista",
  "numero": "número ou S/N",
  "via_secundaria": "travessa/passagem/viela se presente, ou null",
  "poi": "nome do estabelecimento/comércio se presente, ou null"
}

Regras: corrija abreviações comuns (Av.=Avenida, Rovia=Rodovia), preserve nomes próprios, não confunda bairro/loteamento/condomínio com rua e ignore textos como próximo, maps, placas, portão, referência, deixar, não entregar.
Endereço: "${endereco}"`;

  try {
    let url = "";
    let headers: Record<string, string> = { "Content-Type": "application/json" };
    let body: any = {};

    if (aiProvider === "openai") {
      url = "https://api.openai.com/v1/chat/completions";
      headers["Authorization"] = `Bearer ${aiApiKey}`;
      body = {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 200,
        response_format: { type: "json_object" },
      };
    } else if (aiProvider === "anthropic") {
      url = "https://api.anthropic.com/v1/messages";
      headers["x-api-key"] = aiApiKey;
      headers["anthropic-version"] = "2023-06-01";
      body = {
        model: "claude-3-haiku-20240307",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      };
    } else if (aiProvider === "google") {
      url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${aiApiKey}`;
      body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 200, responseMimeType: "application/json" },
      };
    } else {
      return null;
    }

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      logger.warn({ provider: aiProvider, status: resp.status }, "AI parser HTTP error");
      return null;
    }
    const data = await resp.json();

    let jsonStr = "";
    if (aiProvider === "openai") {
      jsonStr = data.choices?.[0]?.message?.content ?? "";
    } else if (aiProvider === "anthropic") {
      jsonStr = data.content?.[0]?.text ?? "";
    } else if (aiProvider === "google") {
      jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    }

    const parsed = JSON.parse(jsonStr.trim());
    logger.debug({ endereco, parsed }, "AI parser result");
    return parsed;
  } catch (err: any) {
    logger.warn({ error: err?.message, provider: aiProvider }, "AI parser failed");
    return null;
  }
}

function montarQueryBusca(parsed: ParsedAddress): string {
  const partes: string[] = [];
  if (parsed.rua_principal) partes.push(parsed.rua_principal);
  const num = parsed.numero.toUpperCase();
  if (num && !["", "0", "SN", "S/N", "S-N"].includes(num)) partes.push(num);
  if (parsed.bairro) partes.push(parsed.bairro);
  if (parsed.cidade) partes.push(parsed.cidade);
  partes.push("Brasil");
  return [...new Set(partes)].join(", ");
}

export function verificarNuance(
  parsed: ParsedAddress,
  geoResult: GeoResult | null,
  gpsLat: number | null,
  gpsLon: number | null,
  geocodeLat: number | null,
  geocodeLon: number | null,
  toleranceMeters: number
): NuanceResult & { distancia_metros: number | null } {
  // Sem resultado do geocoding
  if (!geoResult) {
    return {
      is_nuance: true,
      similaridade: null,
      motivo: "Endereço não encontrado no mapa.",
      distancia_metros: null,
    };
  }
  const ruaOficial = geoResult.rua;
  if (!ruaOficial) {
    return {
      is_nuance: true,
      similaridade: null,
      motivo: "Coordenadas localizadas, mas OSM não identificou via nomeada.",
      distancia_metros: null,
    };
  }

  const ruaExtraida = parsed.rua_principal;
  const similaridade = calcularSimilaridade(ruaExtraida, ruaOficial);
  const limiar = limiarAdaptativo(ruaExtraida, parsed.is_avenida_extensa, parsed.is_comercio);

  if (!ruaExtraida) {
    return {
      is_nuance: true,
      similaridade: null,
      motivo: "Não foi possível extrair o logradouro principal da planilha.",
      distancia_metros: null,
    };
  }

  let distanciaMetros: number | null = null;
  if (gpsLat !== null && gpsLon !== null && geocodeLat !== null && geocodeLon !== null) {
    distanciaMetros = Math.round(haversineMetros(gpsLat, gpsLon, geocodeLat, geocodeLon));
    logger.debug({ distanciaMetros, toleranceMeters, rua: ruaExtraida }, "Distância GPS vs geocoded");
  }

  if (similaridade < limiar) {
    return {
      is_nuance: true,
      similaridade: Math.round(similaridade * 1000) / 1000,
      motivo: `"${ruaExtraida}" difere do oficial "${ruaOficial}" (${Math.round(similaridade * 100)}% < limiar ${Math.round(limiar * 100)}%)`,
      distancia_metros: distanciaMetros,
    };
  }

  if (distanciaMetros !== null && distanciaMetros > toleranceMeters) {
    return {
      is_nuance: true,
      similaridade: Math.round(similaridade * 1000) / 1000,
      motivo: `Coordenada GPS a ${distanciaMetros}m do oficial (tolerância: ${toleranceMeters}m)${parsed.is_comercio ? ". Comércio/POI não confirmado." : parsed.is_avenida_extensa ? ". Avenida extensa: exige alta precisão." : ""}`,
      distancia_metros: distanciaMetros,
    };
  }

  return {
    is_nuance: false,
    similaridade: Math.round(similaridade * 1000) / 1000,
    motivo: "",
    distancia_metros: distanciaMetros,
  };
}

export async function processarEndereco(
  item: AddressRow,
  instanceMode: string,
  googleMapsApiKey: string | null,
  ultimaReq: number,
  cache: Map<string, { data: GeoResult | null; ts: number }>,
  toleranceMeters: number = 300,
  parserMode: string = "builtin",
  aiProvider: string | null = null,
  aiApiKey: string | null = null
): Promise<{ resultado: ResultRow; ultimaReq: number }> {
  logger.info({ linha: item.linha, endereco: item.endereco, instanceMode, parserMode }, "Processando endereço");

  let parsed: ParsedAddress = parsearEndereco(item.endereco, item.cidade, item.bairro, item.cep);

  // AI parser mode: tentar melhorar a extração com IA
  if (parserMode === "ai" && aiProvider && aiApiKey) {
    const aiResult = await parseAddressWithAI(item.endereco, aiProvider, aiApiKey);
    if (aiResult) {
      if (aiResult.rua_principal) parsed.rua_principal = aiResult.rua_principal;
      if (aiResult.via_secundaria !== undefined) parsed.via_secundaria = aiResult.via_secundaria ?? null;
      if (aiResult.poi !== undefined && aiResult.poi) parsed.poi = aiResult.poi;
      // Re-avaliar flags
      parsed.is_comercio = PALAVRAS_COMERCIO_REGEX.test(parsed.poi) || PALAVRAS_COMERCIO_REGEX.test(item.endereco);
      parsed.is_avenida_extensa = AVENIDAS_EXTENSAS_REGEX.test(parsed.rua_principal);
    }
  }

  const tipoEndereco = parsed.is_comercio
    ? "comercio"
    : parsed.is_avenida_extensa
    ? "avenida_extensa"
    : parsed.via_secundaria
    ? "via_secundaria"
    : "residencial";

  logger.debug({ linha: item.linha, rua: parsed.rua_principal, viaSecundaria: parsed.via_secundaria, poi: parsed.poi, tipo: tipoEndereco }, "Endereço parseado");

  const cep = parsed.cep;
  let geoResult: GeoResult | null = null;
  let reverseGeoResult: GeoResult | null = null;
  let forwardGeoResult: GeoResult | null = null;
  let geocodeLat: number | null = null;
  let geocodeLon: number | null = null;
  let newUltimaReq = ultimaReq;

  if (instanceMode === "googlemaps" && googleMapsApiKey) {
    if (item.lat !== null && item.lon !== null) {
      reverseGeoResult = await geocodeGoogleMapsReverse(item.lat, item.lon, googleMapsApiKey);
      geoResult = reverseGeoResult;
      if (reverseGeoResult?.lat) geocodeLat = reverseGeoResult.lat;
      if (reverseGeoResult?.lon) geocodeLon = reverseGeoResult.lon;
    }

    const query = montarQueryBusca(parsed);
    forwardGeoResult = await geocodeGoogleMaps(query, googleMapsApiKey);
    if (!geoResult) geoResult = forwardGeoResult;
    if (forwardGeoResult?.lat) geocodeLat = forwardGeoResult.lat;
    if (forwardGeoResult?.lon) geocodeLon = forwardGeoResult.lon;

    if (!forwardGeoResult && parsed.via_secundaria) {
      const qVia = [parsed.via_secundaria, parsed.cidade, "Brasil"].filter(Boolean).join(", ");
      forwardGeoResult = await geocodeGoogleMaps(qVia, googleMapsApiKey);
      if (!geoResult) geoResult = forwardGeoResult;
      if (forwardGeoResult?.lat) geocodeLat = forwardGeoResult.lat;
      if (forwardGeoResult?.lon) geocodeLon = forwardGeoResult.lon;
    }
  } else {
    if (item.lat !== null && item.lon !== null) {
      const cacheKey = `rev_${Math.round(item.lat * 100000)}_${Math.round(item.lon * 100000)}`;
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < 2 * 3600 * 1000) {
        reverseGeoResult = cached.data;
      } else {
        const rev = await geocodeReverseNominatim(item.lat, item.lon, newUltimaReq);
        reverseGeoResult = rev.result;
        newUltimaReq = rev.ultimaReq;
        if (!reverseGeoResult) reverseGeoResult = await geocodeReversePhoton(item.lat, item.lon);
        cache.set(cacheKey, { data: reverseGeoResult, ts: Date.now() });
      }
      geoResult = reverseGeoResult;
      if (reverseGeoResult?.lat) geocodeLat = reverseGeoResult.lat;
      if (reverseGeoResult?.lon) geocodeLon = reverseGeoResult.lon;
    }

    if (cep) {
      const brasilApiData = await geocodeBrasilAPI(cep);
      if (brasilApiData) {
        if (!parsed.rua_principal) parsed.rua_principal = brasilApiData.rua;
        if (!parsed.cidade) parsed.cidade = brasilApiData.cidade;
        if (!parsed.bairro) parsed.bairro = brasilApiData.bairro;
      }
    }

    if (parsed.rua_principal) {
      const query = montarQueryBusca(parsed);
      const cacheKey = `fwd_${query}`;
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < 2 * 3600 * 1000) {
        forwardGeoResult = cached.data;
        if (!geoResult) geoResult = forwardGeoResult;
        if (forwardGeoResult?.lat) geocodeLat = forwardGeoResult.lat;
        if (forwardGeoResult?.lon) geocodeLon = forwardGeoResult.lon;
      } else {
        const fwd = await geocodeForwardNominatim(query, newUltimaReq);
        forwardGeoResult = fwd.result;
        newUltimaReq = fwd.ultimaReq;
        if (!geoResult) geoResult = forwardGeoResult;
        if (forwardGeoResult?.lat) geocodeLat = forwardGeoResult.lat;
        if (forwardGeoResult?.lon) geocodeLon = forwardGeoResult.lon;
        cache.set(cacheKey, { data: forwardGeoResult, ts: Date.now() });
      }
    }

    // Para via secundária (Travessa B, Passagem, etc.): geocodar separadamente
    if (parsed.via_secundaria) {
      const viaKey = `via_${parsed.via_secundaria}_${parsed.cidade}`;
      const cachedVia = cache.get(viaKey);
      if (cachedVia && Date.now() - cachedVia.ts < 2 * 3600 * 1000) {
        // Se a via secundária foi encontrada e tem coordenada, usamos ela
        if (cachedVia.data?.lat && cachedVia.data?.lon) {
          if (!geocodeLat) { geocodeLat = cachedVia.data.lat; geocodeLon = cachedVia.data.lon; }
          if (!geoResult) geoResult = cachedVia.data;
        }
      } else {
        const fwdVia = await geocodeViaSecundaria(parsed.via_secundaria, parsed.cidade, parsed.bairro, newUltimaReq);
        newUltimaReq = fwdVia.ultimaReq;
        cache.set(viaKey, { data: fwdVia.result, ts: Date.now() });
        if (fwdVia.result?.lat && fwdVia.result?.lon) {
          // Via secundária encontrada: verificar se está próxima da rua principal
          if (geocodeLat && geocodeLon) {
            const dist = haversineMetros(geocodeLat, geocodeLon, fwdVia.result.lat!, fwdVia.result.lon!);
            logger.debug({ viaSecundaria: parsed.via_secundaria, dist, rue: parsed.rua_principal }, "Distância rua×via secundária");
            if (dist <= 800) {
              // Travessa está perto da rua principal → usar coordenada da travessa
              geocodeLat = fwdVia.result.lat!;
              geocodeLon = fwdVia.result.lon!;
              if (!reverseGeoResult) geoResult = { rua: fwdVia.result.rua, lat: fwdVia.result.lat, lon: fwdVia.result.lon };
            }
          } else {
            geocodeLat = fwdVia.result.lat!;
            geocodeLon = fwdVia.result.lon!;
            if (!geoResult) geoResult = fwdVia.result;
          }
        }
      }
    }

    // Para comércios: tentar geocodar o POI diretamente
    if (parsed.is_comercio && parsed.poi) {
      const poiKey = `poi_${parsed.poi}_${parsed.rua_principal}_${parsed.cidade}`;
      const cachedPoi = cache.get(poiKey);
      if (cachedPoi && Date.now() - cachedPoi.ts < 2 * 3600 * 1000) {
        if (cachedPoi.data?.lat) { geocodeLat = cachedPoi.data.lat!; geocodeLon = cachedPoi.data.lon!; }
        if (!geoResult) geoResult = cachedPoi.data;
      } else {
        const fwdPoi = await geocodeForwardPOI(parsed.poi, parsed.rua_principal, parsed.cidade, newUltimaReq);
        newUltimaReq = fwdPoi.ultimaReq;
        cache.set(poiKey, { data: fwdPoi.result, ts: Date.now() });
        if (fwdPoi.result?.lat) {
          geocodeLat = fwdPoi.result.lat!;
          geocodeLon = fwdPoi.result.lon!;
          if (!geoResult) geoResult = fwdPoi.result;
        }
      }
    }
  }

  const verif = verificarNuance(
    parsed, geoResult,
    item.lat, item.lon,
    geocodeLat, geocodeLon,
    toleranceMeters
  );

  logger.info({
    linha: item.linha,
    rua: parsed.rua_principal,
    oficial: geoResult?.rua,
    similaridade: verif.similaridade,
    is_nuance: verif.is_nuance,
    distancia: verif.distancia_metros,
    motivo: verif.motivo || "OK",
    tipo: tipoEndereco,
  }, "Resultado endereço");

  return {
    resultado: {
      linha: item.linha,
      endereco_original: item.endereco,
      nome_rua_extraido: parsed.rua_principal || null,
      nome_rua_oficial: geoResult?.rua ?? null,
      similaridade: verif.similaridade,
      is_nuance: verif.is_nuance,
      motivo: verif.motivo,
      poi_estruturado: (parsed as any).poi_estruturado ?? null,
      distancia_metros: verif.distancia_metros,
      tipo_endereco: tipoEndereco,
    },
    ultimaReq: newUltimaReq,
  };
}
