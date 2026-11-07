FROM node:24.20.0-bookworm

LABEL io.dnd.verification-image="1"
RUN apt-get update && apt-get install -y --no-install-recommends \
    ripgrep openjdk-17-jre-headless jq \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

ARG TARGETARCH
COPY dhall-json-toolchain.json /tmp/dhall-json-toolchain.json
RUN set -eu; \
    case "$TARGETARCH" in \
      amd64) ;; \
      arm64) dpkg --add-architecture amd64 ;; \
      *) exit 78 ;; \
    esac; \
    apt-get update; \
    apt-get install -y --no-install-recommends libc6:amd64 libgmp10:amd64 zlib1g:amd64 libtinfo6:amd64; \
    if [ "$TARGETARCH" = arm64 ]; then apt-get install -y --no-install-recommends qemu-user-static; fi; \
    set -- $(node -e 'const t = require("/tmp/dhall-json-toolchain.json"); console.log(t.dhallHaskellRelease, t.dhallJsonVersion, t.linuxX64ArchiveSha256)'); \
    curl --fail --location --retry 3 \
      "https://github.com/dhall-lang/dhall-haskell/releases/download/$1/dhall-json-$2-x86_64-linux.tar.bz2" \
      --output /tmp/dhall-json.tar.bz2; \
    echo "$3  /tmp/dhall-json.tar.bz2" | sha256sum --check; \
    mkdir -p /opt/dhall-json; \
    tar -xjf /tmp/dhall-json.tar.bz2 -C /opt/dhall-json; \
    if [ "$TARGETARCH" = arm64 ]; then \
      printf '#!/bin/sh\nexec /usr/bin/qemu-x86_64-static /opt/dhall-json/bin/dhall-to-json "$@"\n' > /usr/local/bin/dhall-to-json; \
      chmod +x /usr/local/bin/dhall-to-json; \
    else ln -s /opt/dhall-json/bin/dhall-to-json /usr/local/bin/dhall-to-json; fi; \
    test "$(dhall-to-json --version)" = "$2"; \
    rm -rf /var/lib/apt/lists/* /tmp/dhall-json.tar.bz2 /tmp/dhall-json-toolchain.json

RUN case "$TARGETARCH" in amd64) arch=x64 ;; arm64) arch=arm64 ;; *) exit 78 ;; esac \
    && curl --fail --location --retry 3 \
      "https://github.com/jdx/mise/releases/download/v2026.8.10/mise-v2026.8.10-linux-${arch}.tar.xz" \
      --output /tmp/mise.tar.xz \
    && tar -xJf /tmp/mise.tar.xz -C /tmp \
    && install /tmp/mise/bin/mise /usr/local/bin/mise \
    && rm -rf /tmp/mise /tmp/mise.tar.xz
ENV MISE_DATA_DIR=/opt/mise
RUN mise install node@24.20.0
WORKDIR /workspace
