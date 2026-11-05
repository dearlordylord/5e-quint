FROM node:24.20.0-bookworm

LABEL io.dnd.verification-image="1"
RUN apt-get update && apt-get install -y --no-install-recommends \
    ripgrep openjdk-17-jre-headless \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.29.3 --activate

ARG TARGETARCH
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
