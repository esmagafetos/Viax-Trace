# =============================================================================
#  ViaX:Trace — geocodebr Microservice
#  Geocodificação via CNEFE/IBGE (pacote geocodebr do IPEA)
#
#  Local:
#    docker build -t viax-geocodebr .
#    docker run -p 8002:8002 -v geocodebr-cache:/root/.cache viax-geocodebr
#
#  Render:
#    Use o blueprint na raiz (render.yaml). O serviço lê $PORT em runtime.
# =============================================================================
FROM rocker/r-ver:4.4.1

LABEL maintainer="ViaX:Trace"
LABEL description="geocodebr microservice — CNEFE/IBGE Brazilian address geocoding"

# Dependências de sistema para pacotes espaciais (sf, geocodebr)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    libudunits2-dev \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar pacotes R necessários
RUN Rscript -e "\
  options(repos = c(CRAN = 'https://cran.rstudio.com/')); \
  install.packages(c('plumber', 'geocodebr', 'future', 'promises', 'jsonlite'), \
  dependencies = TRUE, quiet = TRUE)"

WORKDIR /app
COPY plumber.R start.R ./

# Volume para cache do CNEFE (evita re-download a cada restart)
VOLUME ["/root/.cache"]

EXPOSE 8002

# Healthcheck local (Render usa healthCheckPath do blueprint)
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
  CMD Rscript -e "p <- Sys.getenv('PORT', Sys.getenv('GEOCODEBR_PORT', '8002')); tryCatch(readLines(sprintf('http://localhost:%s/health', p)), error=function(e) quit(status=1))"

CMD ["Rscript", "start.R"]
