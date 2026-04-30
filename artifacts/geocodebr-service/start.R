# =============================================================================
#  ViaX:Trace — Inicialização do servidor geocodebr
# =============================================================================
library(plumber)
library(future)

# ── Resolve o diretório do próprio script ────────────────────────────────────
# pr("plumber.R") usa caminho RELATIVO ao working directory; sem isto, quando
# o script é invocado por caminho absoluto (ex: `Rscript /root/viax-geocodebr/
# start.R` a partir de /root), o R procura plumber.R no wd errado e falha com
# "File does not exist: plumber.R".
.args         <- commandArgs(trailingOnly = FALSE)
.file_arg     <- .args[grep("^--file=", .args)]
.script_path  <- if (length(.file_arg)) sub("^--file=", "", .file_arg[1]) else "start.R"
.script_dir   <- dirname(normalizePath(.script_path, mustWork = FALSE))
if (nzchar(.script_dir) && dir.exists(.script_dir)) setwd(.script_dir)

# Habilita processamento assíncrono para múltiplas requisições simultâneas
future::plan("multisession")

port <- as.integer(Sys.getenv("PORT", Sys.getenv("GEOCODEBR_PORT", "8002")))

cat("=============================================================\n")
cat(" ViaX:Trace — geocodebr Microservice\n")
cat(sprintf(" Porta : %d\n", port))
cat(sprintf(" Dir   : %s\n", getwd()))
cat(" Fonte : CNEFE / IBGE (via geocodebr)\n")
cat("=============================================================\n\n")

cat("Carregando dados CNEFE (pode levar alguns minutos no primeiro inicio)...\n")

pr("plumber.R") |>
  pr_run(host = "0.0.0.0", port = port)
