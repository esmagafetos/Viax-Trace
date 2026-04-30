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
FROM rocker/r-ver:4.4.1

LABEL org.opencontainers.image.source="https://github.com/ViaXTrace/Viax-Trace"
LABEL org.opencontainers.image.title="ViaX:Trace — geocodebr microservice"

ENV DEBIAN_FRONTEND=noninteractive

# Dependências de sistema para sf, arrow, duckdb, e curl (healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgdal-dev libgeos-dev libproj-dev libudunits2-dev \
      libcurl4-openssl-dev libssl-dev libxml2-dev \
      curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# rocker/r-ver pré-configura Posit Public Package Manager (P3M) com binários
# Ubuntu pré-compilados — instalação fica em ~2-4 min. Listamos enderecobr
# explicitamente para garantir versão atual (>=0.6) compatível com geocodebr 0.6.2.
RUN Rscript -e "install.packages(c('plumber','future','promises','jsonlite','geocodebr','enderecobr','arrow','duckdb','sf','dplyr','httr2','h3r','geoarrow','duckspatial'), dependencies=TRUE, quiet=TRUE); cat('\n=== Versoes instaladas ===\n'); for (p in c('plumber','geocodebr','enderecobr','arrow','duckdb','sf')) cat(sprintf('%-10s: %s\n', p, packageVersion(p)))"

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
