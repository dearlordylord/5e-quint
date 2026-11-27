FROM --platform=linux/amd64 node:24.20.0-trixie AS dhall
COPY dhall-json-toolchain.json /tmp/dhall-json-toolchain.json
RUN set -eu; \
    toolchain="$(node -e 'const t = require("/tmp/dhall-json-toolchain.json"); console.log(t.dhallHaskellRelease, t.dhallJsonVersion, t.linuxX64ArchiveSha256)')"; \
    set -- $toolchain; \
    curl --fail --location --retry 3 \
      "https://github.com/dhall-lang/dhall-haskell/releases/download/$1/dhall-json-$2-x86_64-linux.tar.bz2" \
      --output /tmp/dhall-json.tar.bz2; \
    echo "$3  /tmp/dhall-json.tar.bz2" | sha256sum --check; \
    mkdir -p /opt/dhall; \
    tar -xjf /tmp/dhall-json.tar.bz2 -C /opt/dhall; \
    cp -L --parents /lib/x86_64-linux-gnu/libm.so.6 /lib/x86_64-linux-gnu/libz.so.1 \
      /lib/x86_64-linux-gnu/libtinfo.so.6 /lib/x86_64-linux-gnu/libgmp.so.10 \
      /lib/x86_64-linux-gnu/libc.so.6 /lib64/ld-linux-x86-64.so.2 /opt/dhall; \
    test "$(/opt/dhall/bin/dhall-to-json --version)" = "$2"

FROM node:24.20.0-trixie

LABEL io.dnd.verification-image="1"
RUN apt-get update && apt-get install -y --no-install-recommends \
    ripgrep jq openjdk-21-jre-headless \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

ARG TARGETARCH
COPY --from=dhall /opt/dhall /opt/dhall
RUN set -eu; \
    case "$TARGETARCH" in \
      amd64) ln -s /opt/dhall/bin/dhall-to-json /usr/local/bin/dhall-to-json ;; \
      arm64) apt-get update && apt-get install -y --no-install-recommends qemu-user \
        && rm -rf /var/lib/apt/lists/*; \
        printf '%s\n' '#!/bin/sh' 'exec qemu-x86_64 -L /opt/dhall /opt/dhall/bin/dhall-to-json "$@"' \
          > /usr/local/bin/dhall-to-json; \
        chmod +x /usr/local/bin/dhall-to-json ;; \
      *) exit 78 ;; \
    esac; \
    dhall-to-json --version
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
