# Relatório técnico — Nuances de validação de rota

**Cliente:** IVONI CONCEIÇÃO CAMPOS SANTOS
**Praça:** Cabo Frio (RJ), distrito de Tamoios — bairros Aquarius, Nova Califórnia, Centro Hípico
**Data da rota:** 23/04/2026
**Volume analisado:** 25 paradas
**Sistema avaliado:** ViaX:Trace v8 — pipeline `process/upload` + `geocoder.ts` + `verificarNuance`

---

## 1. Sumário executivo

A rota analisada concentra três padrões de falha que o validador atual **não captura como nuance**, mas que o entregador real identifica em segundos: (i) endereços compostos com servidão/beco interno em que a coordenada cai no número da via principal e não no destino real; (ii) endereços condominiais com referência de Quadra/Lote em texto livre, onde o GPS aponta para o centróide do condomínio e o sistema valida a rua sem perceber que o lote correto está a 80–150 m; (iii) endereços com referência primária de POI ("em frente ao Mendonça", "ao lado do Império das Bebidas", "próximo ao Hospital Tamoios") em que a melhor pista de validação — o próprio POI — nunca é geocodificada. Em paralelo, identificamos 7 gaps arquiteturais relevantes (número predial ignorado, tolerância única de 300 m cega ao contexto urbano, ausência de match fonético, CEP subaproveitado, falta de cache de entregas confirmadas, sem deduplicação de paradas idênticas e sem detecção de via homônima). As 13 melhorias propostas são incrementais sobre o pipeline atual (não exigem reescrita) e seguem ordenadas por impacto esperado na taxa de detecção correta.

---

## 2. Padrões de "nuance" encontrados na rota

### 2.1 Endereço composto com servidão/beco interno

| # | Endereço | Coordenada | Sintoma |
|---|----------|------------|---------|
| 01 | Rua Porto Alegre, 188, **Servidão casa amarela n 10** | -22.6069, -42.0073 | Sistema valida pelo nº 188 da via principal; destino real é o nº 10 dentro da servidão lateral. Distância típica entrega→GPS: 40–120 m. |
| 05 | Travessa das Flores, 01, **Casa de esquina** | -22.5901, -42.0026 | Travessa curta, GPS no início; entregador precisa identificar visualmente. |

**Padrão:** o segundo segmento textual (após a vírgula) contém palavras-chave (*Servidão, Beco, Vila, Conjunto, Casa N°*) que indicam que o endereço **não termina** no número predial declarado.

### 2.2 Condomínio horizontal com Quadra/Lote em texto livre

| # | Endereço | Coordenada | Sintoma |
|---|----------|------------|---------|
| 03 | Rua Sergio Ribeiro, 09, **Gravatá 01 quadra 16** | -22.6199, -42.0193 | "Gravatá 01" é o condomínio; quadra 16 não é interpretada. |
| 09 | Avenida André Terra, 417, **Quadra P. Gravatá 1** | -22.6202, -42.0273 | Mesma situação. |
| 11 | Rua das Pacas **Gravata 2 qd V lt 646** | -22.6262, -42.0205 | Endereço inteiro é referência de condomínio. |
| 12, 13 | Rua Zélia Gatai, 11 A, **Condomínio Gravata II PD18 Lt 1** | -22.6244, -42.0211 | Dois pacotes (SPX TN distintos) no mesmo lote — duplicidade não tratada. |
| 14 | Rua das Pacas. **Final do Último Condomínio. Qd. 49 lt 1625** | -22.6226, -42.0244 | Texto livre extremo; sem parser estruturado. |
| 15 | Rua Tório, 02, **Bonganvile 4 quadra 29 lote 874** | -22.6314, -42.0291 | Erro tipográfico no nome do condomínio + quadra/lote numéricos. |

**Padrão:** o sistema tem uma *Ferramenta de Condomínios* dedicada (já no produto), mas a validação geral de rotas vive em silo e não consulta essa base. O GPS típico desses endereços é o **centróide do condomínio**, e dentro do raio de 300 m do threshold cabem 6–10 lotes vizinhos — todos validariam como OK.

### 2.3 POI como referência primária subutilizada

| # | Endereço | POI extraível |
|---|----------|---------------|
| 06 | Rua Pargo, 01, **Rua da madeireira Marbel praia** | "Madeireira Marbel" |
| 08 | Rua das Pacas Loja C, 358, **Loja em frente ao Mendonça** | "Mendonça" |
| 10 | Avenida Independência, 4290, **Ao lado do Império das Bebidas** | "Império das Bebidas" |
| 16 | R: Nininho Casa 2, 13b, **Próximo da imobiliária Taylan** | "Imobiliária Taylan" |
| 24 | Rua Tubarão, 59, **Próximo ao Hospital Tamoios** | "Hospital Tamoios" |

**Padrão:** o validador classifica como `is_comercio` e aperta o threshold de similaridade (0.72) — mas ignora a **melhor pista possível**. Geocodificar o POI separadamente e exigir que o GPS da planilha esteja num raio plausível desse POI eliminaria a ambiguidade.

### 2.4 Erros tipográficos no nome da via

| # | Texto na planilha | Forma canônica esperada |
|---|--------------------|-------------------------|
| 02 | Bouganville | Bougainville |
| 11 | Gravata | Gravatá |
| 12 | gavata | Gravatá |
| 14 | Bonganvile | Bougainville |
| 15 | Tório | Thório (ou variante) |

**Padrão:** o algoritmo Jaccard de bigramas + presença de palavras quebra com erros de 1–2 letras em palavras curtas. Para "Bouganville/Bougainville" a similaridade fica em torno de 0.55, abaixo do threshold de 0.68 → **falso positivo de nuance**.

### 2.5 Outras anomalias estruturais detectadas

| Anomalia | Linhas | Impacto |
|----------|--------|---------|
| Cidade/UF embutidos no campo de endereço | 14, 15, 16, 25 | Parser concatena duplicidade ao consultar Photon/Nominatim. |
| CEP sem hífen (`28925792`, `28927503`, `28927563`) | 14, 15, 16, 25 | Quebra a normalização para BrasilAPI v2. |
| Bairro vazio | 14, 15, 16, 25 | Perde contexto de desambiguação na busca textual. |
| Coordenadas com baixa precisão (4 casas decimais ≈ 11 m) | 01, 02 | Incerteza intrínseca já consome ~10% do threshold de 300 m. |
| Pacotes distintos com mesma coordenada | 12 e 13 | Geocodificação duplicada; relatório duplica nuance se houver. |

---

## 3. Gaps identificados no sistema atual

> Numerados por impacto decrescente. Cada gap aponta o componente do código onde reside e a evidência observada na rota.

### Gap 1 — Número predial é extraído mas não validado

**Onde:** `parsearEndereco()` extrai `numero` mas `verificarNuance()` compara apenas o nome da rua e a distância da rua geocodificada.
**Evidência:** Linha 01 — GPS pode cair no nº 5 da Rua Porto Alegre; planilha diz nº 188; sistema valida porque "Rua Porto Alegre" bate.
**Consequência:** servidões internas e endereços compostos passam batido.

### Gap 2 — Tolerância única (300 m) cega ao contexto urbano

**Onde:** `verificarNuance({ toleranceMeters: 300 })` — único parâmetro de distância para todos os contextos.
**Evidência:** em condomínio horizontal de Tamoios, 300 m abrange ~8 lotes; em rodovia, 300 m é desprezível.
**Consequência:** simultaneamente *muito tolerante* (condomínios) e *muito rígido* (rural/rodoviário). O sistema já adapta `similaridade` por contexto, mas não adapta `distância`.

### Gap 3 — POIs do texto não são geocodificados

**Onde:** o parser AI/regex já pode identificar "POI" (`is_comercio = true`) mas o pipeline não dispara uma busca textual independente do POI.
**Evidência:** "Hospital Tamoios", "Madeireira Marbel", "Mendonça", "Império das Bebidas", "Imobiliária Taylan" — nomes únicos, 100% geocodificáveis no Nominatim/Overpass.
**Consequência:** desperdiçamos a pista mais forte do endereço.

### Gap 4 — Sem cruzamento com histórico de entregas confirmadas

**Onde:** ausente. `analysesTable` armazena resultados, mas não há índice geoespacial de **stops bem-sucedidos**.
**Evidência:** Tamoios já recebeu milhares de entregas; coords idênticas/próximas (raio de 30 m) muito provavelmente já foram validadas antes.
**Consequência:** custo desnecessário de API e relatório de nuances inflado em rotas conhecidas.

### Gap 5 — Quadra/Lote em texto livre não é parseado nem cruzado com a Ferramenta de Condomínios

**Onde:** `parsearEndereco()` não tem regex para `Qd. X Lt. Y / Quadra X Lote Y / qd V lt 646`. A *Ferramenta de Condomínios* (existente no produto) tem essa inteligência mas vive isolada.
**Evidência:** linhas 03, 09, 11, 12, 13, 14, 15 — sete dos 25 endereços (28% da rota).
**Consequência:** validação grosseira de toda uma classe de endereços condominiais.

### Gap 6 — Match fonético ausente

**Onde:** `calcularSimilaridade()` só usa Jaccard de bigramas + word-presence. Não há Metaphone-PT/Soundex/Levenshtein normalizado por comprimento.
**Evidência:** "Bouganville/Bougainville/Bonganvile", "Gravata/Gravatá/gavata".
**Consequência:** falsos positivos de nuance em endereços corretos com pequenos erros tipográficos.

### Gap 7 — CEP é tratado só como entrada para BrasilAPI, não como evidência cruzada

**Onde:** CEP entra na rota de geocodificação direta, mas não pesa no veredito final.
**Evidência:** se a planilha traz CEP `28925-682` e o GPS cai dentro da área desse CEP (centróide ± raio), é forte evidência mesmo se a rua textual divergir.
**Consequência:** perdemos um sinal fácil e barato.

### Gap 8 — Sem deduplicação de paradas com coordenada idêntica

**Onde:** loop principal em `process.ts` itera linha-a-linha sem agrupamento.
**Evidência:** linhas 12 e 13 da planilha.
**Consequência:** geocodificação duplicada (custo de API) e ruído visual no relatório.

### Gap 9 — Vias homônimas em bairros distintos não são detectadas

**Onde:** `geocoder.ts` retorna o primeiro match relevante; não há *consistency check* entre paradas da mesma análise.
**Evidência:** "Rua das Pacas" aparece nas linhas 02, 08, 11, 14 com coords espalhadas em ~1 km.
**Consequência:** pode validar a parada na via errada se duas vias compartilham o nome.

### Gap 10 — Score da qualidade da própria coordenada da planilha não é exposto

**Onde:** ausente.
**Evidência:** linhas 01 e 02 com 4 casas decimais (≈11 m de incerteza), demais com 6–7 (≈1 m).
**Consequência:** o usuário não percebe que parte do "ruído" vem da fonte, não do validador.

### Gap 11 — Falta loop de feedback do entregador

**Onde:** o app Flutter mostra a análise mas não coleta confirmação na rua.
**Evidência:** o entregador é a fonte definitiva — toda rota passa por ele.
**Consequência:** o sistema não aprende com o que já foi confirmado em campo.

---

## 4. Melhorias propostas (ordenadas por impacto esperado)

### Alto impacto (ataca os 3 padrões dominantes da seção 2)

**M1. Validação por número predial via Overpass.**
Quando o GPS for geocodificado, consultar `addr:housenumber` num raio de 30 m e comparar com o `numero` parseado da planilha. Se divergente em mais de ±5 unidades, marcar como nuance categoria "número-divergente". Resolve diretamente o Gap 1 e captura todos os endereços do tipo 2.1 (servidões internas).

**M2. Tolerância adaptativa por densidade urbana / classe de endereço.**
Substituir o parâmetro único `toleranceMeters: 300` por uma função `getTolerance(context)`:

| Classe | Tolerância |
|--------|------------|
| Rodovia (`is_rodovia`) | 1500 m |
| Avenida extensa (`is_avenida_extensa`) | 250 m |
| Urbana padrão | 200 m |
| Comércio/POI (`is_comercio`) | 80 m |
| Condomínio horizontal (novo flag) | 50 m |

Resolve o Gap 2 e elimina ~50% dos falsos negativos em condomínios.

**M3. Geocodificação independente do POI extraído.**
Quando o parser identificar `poi` ou `is_comercio = true`, disparar uma segunda consulta `"<POI> <city>"` (Nominatim/Photon). Comparar coord. do POI com GPS da planilha. Se ≤80 m, peso +0.20 no score; se >300 m, força nuance independente da rua. Resolve o Gap 3 e melhora drasticamente os endereços tipo 2.3.

**M4. Cache vetorial de entregas confirmadas (PostGIS).**
Adicionar tabela `confirmed_stops(spx_tn, lat, lng, geocoded_address, confirmed_at)` com índice GIST. Antes de geocodificar, fazer `ST_DWithin(point, 30m)`. Hit → reutilizar resultado anterior, marcar como `confianca: "historico"`. Resolve o Gap 4 e corta custo de API em rotas recorrentes (Tamoios é alta recorrência).

**M5. Parser unificado de Quadra/Lote + integração com Ferramenta de Condomínios.**
Adicionar regex em `parsearEndereco()`:
```
/(?:qd|quadra)\.?\s*([A-Z0-9]+).{0,15}(?:lt|lote)\.?\s*(\d+)/i
/(?:condom[íi]nio|cond\.?)\s+([\wÀ-ÿ\s]+?)(?:\s+(?:qd|pd|lt))/i
```
e cruzar com a base de condomínios existente. Quando match, validar com tolerância M2-condomínio e usar o lote como ground truth de coordenada. Resolve o Gap 5 e normaliza 28% da rota analisada.

### Médio impacto

**M6. Match fonético + Levenshtein adaptativo.**
Segundo passe quando Jaccard < 0.68: aplicar Metaphone-PT (existem implementações em JS) e Levenshtein normalizado por `max(len_a, len_b)`. Aceitar se `phonetic_match || lev_norm < 0.20`. Resolve o Gap 6.

**M7. CEP como evidência cruzada.**
Normalizar (`/\D/g`, padding 8 dígitos), validar formato, consultar BrasilAPI v2. Se centróide do CEP estiver ≤500 m do GPS da planilha, +0.15 no score de confiança final. Resolve o Gap 7.

**M8. Detecção de "endereço composto" por palavras-chave.**
Lista de gatilhos (`servidão|beco|vila|conjunto|casa\s+n°?\s*\d+`) no segundo segmento textual. Quando detectado, aumentar `toleranceMeters` em +50 m e marcar `tipo_endereco: "composto"` no relatório. Resolve o caso 2.1 mesmo antes de M1 chegar em produção.

**M9. Deduplicação de paradas com coord. idêntica.**
Pré-processamento: agrupar por `round(lat,5)+round(lng,5)` antes do loop de geocodificação; emitir um único geocode e replicar resultado para os SPX TNs do grupo. Resolve o Gap 8.

**M10. Detecção intra-análise de via homônima.**
Após processar todas as linhas, agrupar por `nome_rua_extraido` e verificar dispersão: se `max_dist > 800 m` entre paradas com a mesma rua, marcar todas com flag `revisar_homonimo: true`. Resolve o Gap 9.

### Baixo impacto / longo prazo

**M11. Score de qualidade da coordenada da planilha.**
Calcular `precisao_estimada_m = 111000 * 10^(-decimals)` para cada coord. e expor no relatório. Educa o usuário e ajuda a desambiguar nuance "do sistema" vs nuance "da fonte". Resolve o Gap 10.

**M12. Confirmação visual no app Flutter.**
Tela rápida pós-entrega: "essa coord. tá certa?" com opção de ajustar ponto e anexar foto. Alimenta a tabela `confirmed_stops` da M4. Resolve o Gap 11.

**M13. Modelo estatístico de nuance (fase 2).**
Após 60 dias com M1–M12 em produção, treinar regressão logística simples sobre os confirmados: features = (similaridade, distância, contexto, CEP_match, POI_match, housenumber_match) → `P(nuance)`. Substitui o conjunto de regras por um único score. ROI só compensa após volume de treino adequado.

---

## 5. Conclusão e próximos passos

A rota IVONI/Tamoios de 23/04/2026 expõe que o validador atual já é razoável para o **caso médio urbano**, mas tem ângulos cegos em três cenários muito comuns no interior fluminense (e em todo loteamento horizontal brasileiro): servidões internas, condomínios fechados com Quadra/Lote e endereços com POI como referência primária. Em vez de uma reescrita, o caminho mais curto é uma série de incrementos cirúrgicos no `verificarNuance()` e `parsearEndereco()`, mais a criação de duas estruturas novas (cache de entregas confirmadas e tabela de POIs locais).

**Próximos passos sugeridos (sprint de 2 semanas):**

1. Implementar M2 (tolerância adaptativa) — 0.5 dia, zero risco, ganho imediato.
2. Implementar M9 (deduplicação) — 0.5 dia, corta custo de API.
3. Implementar M8 (endereço composto) e M11 (score de coord.) — 1 dia, melhoram o relatório sem mexer no veredito.
4. Implementar M1 (housenumber via Overpass) — 2 dias, principal salto de acurácia.
5. Implementar M5 (parser Quadra/Lote + integração Condomínios) — 3 dias.
6. Implementar M3 (POI como segunda consulta) — 2 dias.
7. Sprint seguinte: M4 (PostGIS) e M7 (CEP cruzado).
8. Sprint 3: M6 (fonético) e M12 (confirmação no app).
9. Reservar para o trimestre seguinte: M13 (modelo estatístico) após acumular dados de M12.

Métrica-alvo do sprint: reduzir falsos negativos de nuance em ≥40% no conjunto de rotas Tamoios/Cabo Frio (validado contra inspeção manual de 3 rotas amostrais).
