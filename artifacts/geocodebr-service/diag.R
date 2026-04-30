#!/usr/bin/env Rscript
# =============================================================================
# ViaX:Trace — Diagnóstico do geocodebr no Termux/proot
# Roda fora do Plumber para expor o erro REAL que o callr esconde.
# Uso (dentro do proot Ubuntu):
#   Rscript /root/viax-geocodebr/diag.R
# =============================================================================

options(error = function() { traceback(3); quit(status = 1) })

cat("R       :", R.version.string, "\n")
for (p in c("arrow", "duckdb", "callr", "geocodebr", "enderecobr", "sf", "dplyr")) {
  v <- tryCatch(as.character(packageVersion(p)), error = function(e) "AUSENTE")
  cat(sprintf("%-9s: %s\n", p, v))
}
cat("cache   :", tools::R_user_dir("geocodebr", "cache"), "\n")

free_mb <- tryCatch(
  as.integer(as.numeric(system("df -m / | tail -1 | awk '{print $4}'", intern = TRUE))),
  error = function(e) NA_integer_
)
cat("livre MB:", free_mb, "\n")

cnefe_dir <- tryCatch(
  geocodebr:::cache_dados_cnefe(),
  error = function(e) tools::R_user_dir("geocodebr", "cache")
)
cat("cnefe   :", cnefe_dir, "\n")
if (dir.exists(cnefe_dir)) {
  files <- list.files(cnefe_dir, recursive = TRUE)
  cat("arquivos:", length(files), "\n")
  if (length(files) > 0) cat("amostra :", paste(head(files, 5), collapse = ", "), "\n")
} else {
  cat("arquivos: (diretorio nao existe)\n")
}
cat("\n")

library(geocodebr)

df <- data.frame(
  logradouro = "Avenida Paulista",
  numero     = "1000",
  municipio  = "Sao Paulo",
  estado     = "SP",
  stringsAsFactors = FALSE
)
campos <- definir_campos(
  logradouro = "logradouro",
  numero     = "numero",
  municipio  = "municipio",
  estado     = "estado"
)

cat(">>> Chamando geocodebr::geocode() com verboso=TRUE ...\n\n")

res <- tryCatch(
  geocode(
    enderecos            = df,
    campos_endereco      = campos,
    resultado_completo   = FALSE,
    resolver_empates     = TRUE,
    resultado_sf         = FALSE,
    verboso              = TRUE,
    cache                = TRUE,
    padronizar_enderecos = TRUE
  ),
  error = function(e) {
    cat("\n========= ERRO TOPO =========\n")
    print(e)
    cat("\nclass: ", paste(class(e), collapse = "/"), "\n")
    if (!is.null(e$message)) cat("message:", e$message, "\n")
    if (!is.null(e$call))    { cat("call:   "); print(e$call) }
    pe <- e$parent
    depth <- 1
    while (!is.null(pe)) {
      cat(sprintf("\n========= PARENT %d =========\n", depth))
      print(pe)
      if (!is.null(pe$message)) cat("message:", pe$message, "\n")
      if (!is.null(pe$call))    { cat("call:   "); print(pe$call) }
      pe <- pe$parent
      depth <- depth + 1
      if (depth > 6) break
    }
    if (!is.null(e$trace)) {
      cat("\n========= TRACE =========\n"); print(e$trace)
    }
    NULL
  }
)
cat("\n========= RESULTADO =========\n")
print(res)
