# =============================================================================
#  ViaX:Trace — geocodebr Plumber Microservice
#  Geocodificação de endereços brasileiros via CNEFE/IBGE
#  Porta padrão: 8002
# =============================================================================
library(geocodebr)

# ── Filtro CORS (necessário para chamadas do Node.js) ────────────────────────
#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin",  "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 200
    return(list())
  }
  plumber::forward()
}

# ── GET /geocode ─────────────────────────────────────────────────────────────
#* Geocodifica um endereço brasileiro (CNEFE/IBGE)
#* @param logradouro Nome do logradouro (ex: "Rua das Flores")
#* @param numero     Número do imóvel (ex: "123")
#* @param municipio  Município (ex: "São Paulo")
#* @param estado     Sigla do estado, opcional (ex: "SP")
#* @get /geocode
#* @serializer json list(auto_unbox=TRUE, na="null")
function(logradouro = "", numero = "", municipio = "", estado = "") {
  tryCatch({
    if (nchar(trimws(logradouro)) == 0 || nchar(trimws(municipio)) == 0) {
      res$status <- 400
      return(list(erro = "logradouro e municipio sao obrigatorios"))
    }

    tem_estado <- nchar(trimws(estado)) == 2

    df <- data.frame(
      logradouro = trimws(logradouro),
      numero     = trimws(numero),
      municipio  = trimws(municipio),
      estado     = if (tem_estado) trimws(toupper(estado)) else NA_character_,
      stringsAsFactors = FALSE
    )

    if (tem_estado) {
      campos <- geocodebr::definir_campos(
        logradouro = "logradouro",
        numero     = "numero",
        municipio  = "municipio",
        estado     = "estado"
      )
    } else {
      campos <- geocodebr::definir_campos(
        logradouro = "logradouro",
        numero     = "numero",
        municipio  = "municipio"
      )
    }

    resultado <- geocodebr::geocode(
      enderecos            = df,
      campos_endereco      = campos,
      resultado_completo   = FALSE,
      resolver_empates     = TRUE,
      resultado_sf         = FALSE,
      verboso              = FALSE,
      cache                = TRUE,
      # geocodebr >=0.6.2 exige inputs padronizados (UPPERCASE, sem acento).
      # Sem isto, o callr subprocess emite "Os dados de entrada nao estao
      # padronizados" — que era exatamente o erro mascarado por
      # "in callr subprocess." vindo do tryCatch externo.
      padronizar_enderecos = TRUE
    )

    if (nrow(resultado) > 0 && !is.na(resultado$lat[1]) && !is.na(resultado$lon[1])) {
      list(
        lat          = as.numeric(resultado$lat[1]),
        lon          = as.numeric(resultado$lon[1]),
        precisao     = resultado$precisao[1],
        tipo         = as.character(resultado$tipo_resultado[1]),
        desvio_metros = if (!is.na(resultado$desvio_metros[1])) as.numeric(resultado$desvio_metros[1]) else NULL,
        encontrado   = TRUE
      )
    } else {
      list(encontrado = FALSE, lat = NULL, lon = NULL, precisao = NULL, tipo = "nao_encontrado")
    }
  }, error = function(e) {
    list(encontrado = FALSE, erro = as.character(e$message), lat = NULL, lon = NULL)
  })
}

# ── GET /health ───────────────────────────────────────────────────────────────
#* Verifica saúde do serviço
#* @get /health
#* @serializer json list(auto_unbox=TRUE)
function() {
  list(
    status = "ok",
    servico = "geocodebr",
    fonte = "CNEFE/IBGE",
    r_versao = as.character(R.version$version.string)
  )
}
