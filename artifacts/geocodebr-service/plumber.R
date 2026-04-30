# =============================================================================
#  ViaX:Trace — geocodebr Plumber Microservice
#  Geocodificação de endereços brasileiros via CNEFE/IBGE
#  Porta padrão: 8002
# =============================================================================
library(geocodebr)

.PLUMBER_VERSION <- "2026-04-30.apikey"
cat(sprintf("[plumber.R] carregado (versao=%s)\n", .PLUMBER_VERSION))

# ─────────────────────────────────────────────────────────────────────────────
# Por que adicionamos cep e bairro como NA:
#
# Lendo R/geocode.R do geocodebr 0.6.2 (linhas 246-258), vimos que o pacote
# exige que TODAS as 6 colunas `_padr` estejam presentes no input já
# padronizado, sem exceção:
#
#   all_cols_padr <- c("estado_padr", "municipio_padr", "logradouro_padr",
#                      "numero_padr", "cep_padr", "bairro_padr")
#   if (isFALSE(all(all_cols_padr %in% names(input_padrao))))
#     error_input_nao_padronizado()
#
# O `enderecobr::padronizar_enderecos` só cria a coluna `*_padr` se o
# argumento correspondente foi passado em `correspondencia_campos()`. Ou
# seja: quando NÃO temos cep e bairro nos dados de entrada, precisamos
# (a) adicionar essas colunas ao df como NA, e (b) declará-las em
# `definir_campos()`. Aí o `geocodebr` chama internamente o `enderecobr`
# com cep e bairro, gera `cep_padr=NA` e `bairro_padr=NA`, e o check passa.
#
# Com isso voltamos a usar `padronizar_enderecos = TRUE` (interno do
# geocodebr) — não há ganho em padronizar manualmente.
# ─────────────────────────────────────────────────────────────────────────────

.unwrap_error <- function(e) {
  msgs <- character(); cur <- e; depth <- 0
  while (!is.null(cur) && depth < 8) {
    if (!is.null(cur$message) && nzchar(cur$message))
      msgs <- c(msgs, trimws(cur$message))
    cur <- cur$parent; depth <- depth + 1
  }
  paste(unique(msgs), collapse = " | ")
}

#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin",  "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key")
  if (req$REQUEST_METHOD == "OPTIONS") { res$status <- 200; return(list()) }
  plumber::forward()
}

# Filtro de autenticação por chave de API. Roda APÓS o cors (filtros plumber
# rodam em ordem de declaração no arquivo) para que preflight OPTIONS sempre
# responda sem 401. Endpoints públicos /health e /version são liberados pra
# permitir keep-alive (UptimeRobot etc.) e diagnóstico anônimo.
#* @filter apikey
function(req, res) {
  expected <- Sys.getenv("VIAX_API_KEY", "")
  # Sem VIAX_API_KEY definida = modo dev (sem auth). Não usar publico.
  if (!nzchar(expected)) return(plumber::forward())
  if (req$PATH_INFO %in% c("/health", "/version")) return(plumber::forward())

  provided <- req$HTTP_X_API_KEY
  if (is.null(provided) || !identical(provided, expected)) {
    res$status <- 401
    return(list(erro = "API key invalida ou ausente. Forneca header X-API-Key."))
  }
  plumber::forward()
}

#* Geocodifica um endereço brasileiro (CNEFE/IBGE)
#* @param logradouro Nome do logradouro (ex: "Rua das Flores")
#* @param numero     Número do imóvel (ex: "123")
#* @param municipio  Município (ex: "São Paulo") — OBRIGATÓRIO
#* @param estado     Sigla do estado (ex: "SP") — OBRIGATÓRIO em geocodebr
#* @param cep        CEP, opcional (ex: "01310-100")
#* @param bairro     Bairro, opcional (ex: "Bela Vista")
#* @get /geocode
#* @serializer json list(auto_unbox=TRUE, na="null")
function(logradouro = "", numero = "", municipio = "",
         estado = "", cep = "", bairro = "") {
  tryCatch({
    if (nchar(trimws(logradouro)) == 0 || nchar(trimws(municipio)) == 0
        || nchar(trimws(estado)) != 2) {
      return(list(erro = "logradouro, municipio e estado (sigla 2 letras) sao obrigatorios"))
    }

    tem_cep    <- nchar(trimws(cep))    > 0
    tem_bairro <- nchar(trimws(bairro)) > 0

    # Sempre incluímos cep e bairro como colunas no df (NA quando o cliente
    # não passou). Isso garante que o padronizador interno crie cep_padr e
    # bairro_padr — sem elas, o check do geocodebr (R/geocode.R linha 247)
    # falha com "Os dados de entrada nao estao padronizados".
    df <- data.frame(
      logradouro = trimws(logradouro),
      numero     = trimws(numero),
      municipio  = trimws(municipio),
      estado     = trimws(toupper(estado)),
      cep        = if (tem_cep)    trimws(cep)    else NA_character_,
      bairro     = if (tem_bairro) trimws(bairro) else NA_character_,
      stringsAsFactors = FALSE
    )

    # definir_campos sempre recebe TODAS as 6 colunas como strings (não
    # aceita NA_character_, então passamos os nomes mesmo quando os valores
    # nas linhas estão NA — o que importa pro padronizador é a coluna existir).
    campos <- geocodebr::definir_campos(
      logradouro = "logradouro",
      numero     = "numero",
      municipio  = "municipio",
      estado     = "estado",
      cep        = "cep",
      localidade = "bairro"
    )

    resultado <- geocodebr::geocode(
      enderecos            = df,
      campos_endereco      = campos,
      resultado_completo   = FALSE,
      resolver_empates     = TRUE,
      resultado_sf         = FALSE,
      verboso              = FALSE,
      cache                = TRUE,
      padronizar_enderecos = TRUE
    )

    if (nrow(resultado) > 0 && !is.na(resultado$lat[1]) && !is.na(resultado$lon[1])) {
      list(
        encontrado    = TRUE,
        lat           = as.numeric(resultado$lat[1]),
        lon           = as.numeric(resultado$lon[1]),
        precisao      = resultado$precisao[1],
        tipo          = as.character(resultado$tipo_resultado[1]),
        desvio_metros = if (!is.na(resultado$desvio_metros[1])) as.numeric(resultado$desvio_metros[1]) else NULL
      )
    } else {
      list(encontrado = FALSE, lat = NULL, lon = NULL,
           precisao = NULL, tipo = "nao_encontrado")
    }
  }, error = function(e) {
    list(
      encontrado = FALSE,
      erro       = .unwrap_error(e),
      classe     = paste(class(e), collapse = "/"),
      lat        = NULL, lon = NULL
    )
  })
}

#* Retorna a versão do plumber.R em uso
#* @get /version
#* @serializer json list(auto_unbox=TRUE)
function() {
  list(
    plumber_version = .PLUMBER_VERSION,
    abordagem       = "padronizar_enderecos=TRUE com cep e bairro NA",
    geocodebr       = as.character(packageVersion("geocodebr")),
    enderecobr      = tryCatch(as.character(packageVersion("enderecobr")),
                               error = function(e) "AUSENTE"),
    r_version       = as.character(R.version$version.string)
  )
}

#* Verifica saúde do serviço
#* @get /health
#* @serializer json list(auto_unbox=TRUE)
function() {
  list(status = "ok", servico = "geocodebr", fonte = "CNEFE/IBGE",
       r_versao = as.character(R.version$version.string))
}
