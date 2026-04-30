# =============================================================================
#  ViaX:Trace — geocodebr Microservice (Hugging Face Spaces / Docker)
#
#  Build local:
#    docker build -t viax-geocodebr .
#    docker run -p 7860:7860 -e VIAX_API_KEY=test viax-geocodebr
#
#  Hugging Face Spaces:
#    O Space lê o README.md (frontmatter) e usa este Dockerfile como build.
#    Defina o secret VIAX_API_KEY em Settings → Variables and secrets.
# =============================================================================
FROM rocker/r-ver:4.5.1

LABEL org.opencontainers.image.source="https://github.com/ViaXTrace/Viax-Trace"
LABEL org.opencontainers.image.title="ViaX:Trace — geocodebr microservice"

ENV DEBIAN_FRONTEND=noninteractive

# Dependências de sistema para sf (geocodebr usa internamente) e curl (healthcheck).
# Removemos arrow/duckdb/hdf5/netcdf libs porque não eram usados pelo plumber.R.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgdal-dev libgeos-dev libproj-dev libudunits2-dev \
      libcurl4-openssl-dev libssl-dev libxml2-dev \
      curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# rocker/r-ver:4.5.1 vem com Posit Public Package Manager (P3M) configurado para
# um snapshot recente que JÁ contém geocodebr (0.6.x) e enderecobr — coisa que
# faltava no snapshot da imagem 4.4.1 e quebrava o build com
# "packages 'geocodebr', 'duckspatial' are not available for this version of R".
#
# Lista enxuta: só o que plumber.R / start.R efetivamente carregam.
# `dependencies=NA` (default) instala Imports+LinkingTo+Depends do geocodebr,
# o que já traz arrow, duckdb, dplyr, sf e cia. como deps automáticas — não
# precisa listar tudo manualmente, e cortamos ~5 min de build de Suggests.
RUN Rscript -e "install.packages(c('plumber','future','geocodebr'), quiet=TRUE); cat('\n=== Versoes instaladas ===\n'); for (p in c('plumber','geocodebr','enderecobr','sf')) cat(sprintf('%-10s: %s\n', p, packageVersion(p)))"

WORKDIR /app
COPY plumber.R start.R ./

# Cache CNEFE — em free tier do HF é efêmero (perdido em rebuild).
# Em VPS ou paid persistent storage, monte um volume aqui pra persistir.
VOLUME ["/root/.cache/R/geocodebr"]

EXPOSE 7860
ENV PORT=7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD curl -fsS "http://localhost:${PORT:-7860}/health" >/dev/null || exit 1

CMD ["Rscript", "start.R"]
