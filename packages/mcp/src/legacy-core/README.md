# Legacy Core MCP Path

This directory contains the old Core-backed MCP host, session router, runtime
input decoders, scripts, and tests. It is isolated here so the promoted MCP
entrypoint can run through the Surface, character-creation runtime, and battle
runtime packages without importing `@dnd/core`.

This boundary is deletion-marked. It is not a compatibility-supported API, and
new Surface-runtime tools must not import from it. Legacy probes and harnesses
are not exposed as package scripts because the normal MCP entrypoint is the
Surface-runtime server.
