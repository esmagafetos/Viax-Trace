/**
 * Regression suite for the address parser. Run with:
 *   pnpm exec tsx --test artifacts/api-server/src/lib/geocoder.test.ts
 *
 * Each case is a real address pulled from production XLSX files in
 * attached_assets/ and represents a previously broken or fragile pattern.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parsearEndereco,
  calcularSimilaridade,
} from "./geocoder.js";

function parse(addr: string, cidade = "Cabo Frio", bairro = "Verão Vermelho (Tamoios)", cep = "") {
  return parsearEndereco(addr, cidade, bairro, cep);
}

test("strips Quadra abbreviation 'Qu N' from street name", () => {
  const p = parse("Rua Lima Barreto Qu 18PD, LT4A, Ao lado da escola CEM MOTTA");
  assert.equal(p.rua_principal, "Rua Lima Barreto");
});

test("keeps numeric street name (Avenida 1)", () => {
  const p = parse("Avenida 1 - vivamar Lote 9 Q. J, Sn, Em frente ao poste de luz 24/");
  assert.equal(p.rua_principal, "Avenida 1");
});

test("keeps numeric street name (R Apolo 21)", () => {
  const p = parse("R Apolo 21 Condominio Verão Vermelho2, 7, Duplex FINAL DA RUA");
  assert.equal(p.rua_principal, "R Apolo 21");
  // and POI must be cleaned, not the entire input
  assert.ok(!p.poi.includes("R Apolo 21"), `poi should not echo street, got "${p.poi}"`);
});

test("inline 'travessa X' inside rua_principal is split into via_secundaria", () => {
  const p = parse("Rua Sinagoga travessa E, 29, Casa com o muro cinza");
  assert.equal(p.rua_principal, "Rua Sinagoga");
  assert.match(p.via_secundaria ?? "", /travessa\s*e/i);
});

test("travessa inside parentheses is captured as via_secundaria", () => {
  const p = parse("Rua Sinagoga, 4, Rua dos democratas (travessa D");
  assert.match(p.via_secundaria ?? "", /travessa\s*d/i);
});

test("Km in suffix sets is_rodovia even when rua_principal is local nickname", () => {
  const p = parse("Rua Dez, 116, Km 132 da Rod amaral peixoto");
  assert.equal(p.is_rodovia, true);
  assert.equal(p.km_rodovia, 132);
});

test("Km in numero field sets is_rodovia (Rua Itaperuna, Km127, ...)", () => {
  const p = parse("Rua Itaperuna, Km127, Quadra L Lote C2 casa 2 verde");
  assert.equal(p.is_rodovia, true);
  assert.equal(p.km_rodovia, 127);
});

test("address without explicit logradouro keyword does not echo itself as POI", () => {
  const p = parse("Da Gloria, 4, Próximo ao unafortfer");
  assert.equal(p.rua_principal, "Da Gloria");
  assert.equal(p.poi, "");
});

test("oficina mention after 'frente à' is preserved and detected as commerce", () => {
  const p = parse("Rua das Manhãs, 84, frente à oficina leão de judá");
  assert.equal(p.is_comercio, true);
});

test("R. Apolo Dezoito stays as a single street name", () => {
  const p = parse("Rua Apolo Dezoito, 01, Cest rua a direita c/ amarela");
  assert.equal(p.rua_principal, "Rua Apolo Dezoito");
});

test("address with city in tail does not pollute POI with full tail", () => {
  const p = parse("Av. Sideral, 0, L:10 Q 01 LJ:01, Verão Vermelho (Tamoios), Cabo Frio, Rio de Janeiro, 28929250");
  assert.equal(p.rua_principal, "Av. Sideral");
  assert.equal(p.is_comercio, true); // contains Loja
  // POI should not duplicate the city/state
  assert.ok(!p.poi.includes("Rio de Janeiro"), `poi should be cleaned, got "${p.poi}"`);
});

test("trim parens from bairro for cleaner downstream queries", () => {
  const p = parse("Rua X, 1", "Cabo Frio", "Verão Vermelho (Tamoios)", "");
  // bairroLimpo helper exposed via parser output
  assert.equal((p as any).bairro_limpo ?? p.bairro, "Verão Vermelho");
});

test("similarity: abbreviation R. = Rua matches", () => {
  assert.ok(calcularSimilaridade("R. Apolo", "Rua Apolo") >= 0.7);
});

test("similarity: 'Avenida 1' vs 'Avenida 1' is 1.0", () => {
  assert.equal(calcularSimilaridade("Avenida 1", "Avenida 1"), 1);
});

test("similarity: 'Travessa do Sítio' vs 'Travessa Do Sitio' (accents) matches", () => {
  assert.ok(calcularSimilaridade("Travessa do Sítio", "Travessa Do Sitio") >= 0.85);
});
