---
title: ViaX Trace Geocoder
emoji: 📍
colorFrom: orange
colorTo: purple
sdk: docker
app_port: 7860
pinned: false
short_description: Brazilian address geocoding via CNEFE/IBGE (geocodebr)
---

# ViaX:Trace — Geocoder BR

Microserviço HTTP que geocodifica endereços brasileiros via CNEFE/IBGE
usando o pacote R [`geocodebr`](https://github.com/ipeaGIT/geocodebr) do IPEA.

## Endpoints

| Endpoint | Auth | Descrição |
|---|---|---|
| `GET /health` | público | Verifica saúde |
| `GET /version` | público | Versão dos pacotes |
| `GET /geocode` | requer `X-API-Key` | Geocodifica um endereço |

### Exemplo de chamada

```
GET /geocode?logradouro=Avenida%20Paulista&numero=1000&municipio=S%C3%A3o%20Paulo&estado=SP
Header: X-API-Key: <sua chave>
```

## Configuração

Defina o secret `VIAX_API_KEY` em **Settings → Variables and secrets**.
Se ele não existir, o serviço opera em modo dev (sem auth) — **não use em produção pública**.

## Cache CNEFE

A 1ª chamada de cada estado baixa ~400 MB de dados do IBGE.
Free tier do HF Spaces tem disco efêmero — o cache **é perdido** quando o
Space rebuilda. Para cache persistente, ative persistent storage no Space.
