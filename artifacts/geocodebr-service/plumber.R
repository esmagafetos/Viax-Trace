# =============================================================================
#  ViaX:Trace — geocodebr Plumber Microservice
#  Geocodificação de endereços brasileiros via CNEFE/IBGE
#  Porta padrão: 8002
# =============================================================================
library(geocodebr)

# Marcador de versão deste arquivo — facilita confirmar "o servidor recarregou
# o plumber.R novo" sem precisar grep do disco. Aparece no log de startup
# (start.R) e numa resposta HTTP do /version.
.PLUMBER_VERSION <- "2026-04-30.enderecobr-named-args"
cat(sprintf("[plumber.R] carregado (versao=%s)\n", .PLUMBER_VERSION))

# Loga a assinatura real da enderecobr::padronizar_enderecos no startup, para
# que qualquer mudança futura de API fique imediatamente visível.
if (requireNamespace("enderecobr", quietly = TRUE)) {
  .args_padroniza <- names(formals(enderecobr::padronizar_enderecos))
  cat(sprintf("[plumber.R] enderecobr::padronizar_enderecos args = %s\n",
              paste(.args_padroniza, collapse = ", ")))
}

# Chamar enderecobr explicitamente em vez de delegar para o `padronizar_enderecos
# = TRUE` interno do geocodebr: assim contornamos qualquer mismatch de versão
# entre geocodebr 0.6.2 e enderecobr 0.5.0 (única versão pré-compilada arm64).
#
# enderecobr 0.5.0 NÃO recebe `campos_endereco`; cada coluna é passada como
# argumento próprio cujo VALOR é o nome da coluna no data.frame. O argumento
# de coluna ausente deve ser NULL.
.padronizar <- function(df, tem_estado) {
  if (!requireNamespace("enderecobr", quietly = TRUE)) {
    stop("Pacote 'enderecobr' nao instalado. Rode bash install-geocodebr-termux.sh")
  }
  enderecobr::padronizar_enderecos(
    enderecos       = df,
    logradouro      = "logradouro",
    numero          = "numero",
    municipio       = "municipio",
    estado          = if (tem_estado) "estado" else NULL,
    formato_estados = "sigla",
    formato_numeros = "integer"
  )
}

# Desempacota um erro do callr/rlang até a mensagem-raiz mais informativa.
# Sem isto, todo erro vem como "in callr subprocess." e a causa fica enterrada
# em e$parent$parent$...
.unwrap_error <- function(e) {
  msgs <- character()
  cur  <- e
  depth <- 0
  while (!is.null(cur) && depth < 8) {
    if (!is.null(cur$message) && nzchar(cur$message)) {
      msgs <- c(msgs, trimws(cur$message))
    }
    cur <- cur$parent
    depth <- depth + 1
  }
  msgs <- unique(msgs)
  paste(msgs, collapse = " | ")
}

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

    df_padronizado <- .padronizar(df, tem_estado)

    resultado <- geocodebr::geocode(
      enderecos            = df_padronizado,
      campos_endereco      = campos,
      resultado_completo   = FALSE,
      resolver_empates     = TRUE,
      resultado_sf         = FALSE,
      verboso              = FALSE,
      cache                = TRUE,
      padronizar_enderecos = FALSE
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
    list(
      encontrado = FALSE,
      erro       = .unwrap_error(e),
      classe     = paste(class(e), collapse = "/"),
      lat        = NULL,
      lon        = NULL
    )
  })
}

# ── GET /version ──────────────────────────────────────────────────────────────
#* Retorna a versão do plumber.R em uso (útil para confirmar reload do servidor)
#* @get /version
#* @serializer json list(auto_unbox=TRUE)
function() {
  list(
    plumber_version    = .PLUMBER_VERSION,
    padronizacao       = "explicita_via_enderecobr",
    geocodebr          = as.character(packageVersion("geocodebr")),
    enderecobr         = tryCatch(as.character(packageVersion("enderecobr")),
                                  error = function(e) "AUSENTE"),
    r_version          = as.character(R.version$version.string)
  )
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
