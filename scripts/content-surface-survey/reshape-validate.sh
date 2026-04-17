#!/usr/bin/env bash
# Re-validate a curated slug list against the reshape (feat/species/magic_item
# UnitRecord kinds + PassiveMechanics + grant_feat atom + dawn cadence).
# Sequential, MAX_PARALLEL=1, --force so already-processed slugs rerun.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG="$SCRIPT_DIR/reshape-validate.log"

SLUGS=(
  # passive feats
  feat_defense
  feat_archery
  # passive species
  species_dwarf_darkvision
  species_dragonborn_damage_resistance
  # activated species
  species_dragonborn_breath_weapon
  # magic items: attuned passive
  magic_item_cloak_of_protection
  magic_item_amulet_of_health
  # magic items: charge-based
  magic_item_wand_of_magic_missiles
  magic_item_ring_of_the_ram
)

: > "$LOG"
echo "[$(date -u +%H:%M:%S)] reshape-validate starting (${#SLUGS[@]} slugs)" | tee -a "$LOG"

for slug in "${SLUGS[@]}"; do
  echo "[$(date -u +%H:%M:%S)] running $slug" | tee -a "$LOG"
  MAX_PARALLEL=1 CLAUDE_MODEL=sonnet bash "$SCRIPT_DIR/run-survey.sh" \
    --slug "$slug" --force 2>&1 | tee -a "$LOG"
  echo "---" | tee -a "$LOG"
done

echo "[$(date -u +%H:%M:%S)] reshape-validate done" | tee -a "$LOG"
