FROM alpine:3.19

# Instalar dependencias necesarias
RUN apk add --no-cache \
    bash \
    curl \
    jq \
    ffmpeg \
    wget \
    ca-certificates

# Descargar e instalar MediaMTX
ARG MEDIAMTX_VERSION=v1.12.3
RUN wget https://github.com/bluenviron/mediamtx/releases/download/${MEDIAMTX_VERSION}/mediamtx_${MEDIAMTX_VERSION}_linux_amd64.tar.gz && \
    tar -xzf mediamtx_${MEDIAMTX_VERSION}_linux_amd64.tar.gz && \
    mv mediamtx /usr/local/bin/mediamtx && \
    rm mediamtx_${MEDIAMTX_VERSION}_linux_amd64.tar.gz && \
    chmod +x /usr/local/bin/mediamtx

# Copiar nuestra configuración personalizada (desde el contexto de construcción)
COPY mediamtx.yml /mediamtx.yml

# Crear usuario no-root
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser

# Cambiar a usuario no-root
USER appuser

# Exponer puertos
EXPOSE 8554 1935 8888 8889 8890/udp 9997 8080 9998

# Entrypoint
ENTRYPOINT ["/usr/local/bin/mediamtx"] 