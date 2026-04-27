# =============================================================================
#  ViaX:Trace — Inicialização do servidor geocodebr
# =============================================================================
library(plumber)
library(future)

# Habilita processamento assíncrono para múltiplas requisições simultâneas
future::plan("multisession")

port <- as.integer(Sys.getenv("PORT", Sys.getenv("GEOCODEBR_PORT", "8002")))

cat("=============================================================\n")
cat(" ViaX:Trace — geocodebr Microservice\n")
cat(sprintf(" Porta : %d\n", port))
cat(" Fonte : CNEFE / IBGE (via geocodebr)\n")
cat("=============================================================\n\n")

cat("Carregando dados CNEFE (pode levar alguns minutos no primeiro inicio)...\n")

pr("plumber.R") |>
  pr_run(host = "0.0.0.0", port = port)
