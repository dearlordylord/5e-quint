#!/usr/bin/env bash
set -euo pipefail

RAW_SWARM_ROOT=$(git rev-parse --show-toplevel)
RAW_SWARM_DIR="$RAW_SWARM_ROOT/scripts/raw-swarm"
RAW_SWARM_PROMPT="$RAW_SWARM_DIR/freeplay/freeplay-001-goblin-warrior-vs-skeleton.prompt.txt"
RAW_SWARM_TRANSCRIPT="${1:-$RAW_SWARM_DIR/out/freeplay-001-transcript.jsonl}"
RAW_SWARM_AGENT_LOG="${2:-$RAW_SWARM_DIR/out/freeplay-001-agent.log}"

mkdir -p "$(dirname "$RAW_SWARM_TRANSCRIPT")" "$(dirname "$RAW_SWARM_AGENT_LOG")"

codex exec \
  -C "$RAW_SWARM_ROOT" \
  --sandbox read-only \
  --disable tool_call_mcp_elicitation \
  -m gpt-5.6-sol \
  -c 'model_reasoning_effort="medium"' \
  -c 'mcp_servers.dnd.command="node"' \
  -c "mcp_servers.dnd.args=[\"$RAW_SWARM_DIR/mcp-recording-shim.mjs\",\"--transcript\",\"$RAW_SWARM_TRANSCRIPT\",\"--scenario\",\"freeplay-001-goblin-warrior-vs-skeleton\"]" \
  -c 'mcp_servers.dnd.default_tools_approval_mode="approve"' \
  "$(<"$RAW_SWARM_PROMPT")" \
  >"$RAW_SWARM_AGENT_LOG" 2>&1
