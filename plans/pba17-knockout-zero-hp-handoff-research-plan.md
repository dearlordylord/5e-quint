# PBA17 Research Plan - Knock Out And Zero-HP Handoff Width

Task: PBA17 - Restore Nonlethal Knockout And Zero-HP Handoff Width

Status: pre-researched. This file is planning evidence and implementation guidance only.

## Research Inputs

- RAW lens: Knock Out, Dropping to 0 HP, Death Saving Throws, Stable, rest gates, and Unconscious.
- Ubiquitous-language lens: Creature vs Character, Knock Out vs nonlethal damage, Stable vs positive-HP Unconscious.
- Architecture lens: battle-runtime owns combat HP mutation; MCP/session store owns character-session handoff.

## RAW Anchors

- `.references/srd-5.2.1/Playing-the-Game.md`: HP floor, Knock Out, Dropping to 0 HP, Death Saving Throws, damage at 0 HP, Stabilizing.
- `.references/srd-5.2.1/Rules-Glossary.md`: Knock Out, Stable, Unconscious, Short Rest, Long Rest.
- `ASSUMPTIONS.md` A12: monsters die at 0 HP unless GM treats one like a character.

## Ubiquitous Language Findings

- The rule surface should say **Knock Out**, not "nonlethal damage" or "KO".
- RAW says Knock Out applies to a **creature**, not only a Character.
- Death Saving Throws remain Character-specific in promoted runtime policy.
- Important correction: SRD 5.2.1 Knock Out is **1 HP + Unconscious + starts a Short Rest**, not `0 HP + Stable`.
- `UBIQUITOUS_LANGUAGE.md` currently appears stale where it describes Knock Out as Unconscious and Stable instead of the 2024 SRD 1-HP outcome. Implementation should resolve that documentation mismatch before changing behavior.

## Architecture Findings

- Relevant runtime files:
  - `packages/battle-runtime/src/index.ts`
  - `packages/battle-runtime/battle-runtime.qnt`
  - `packages/battle-runtime/src/index.test.ts`
- Relevant MCP/session files:
  - `packages/mcp/src/start-battle-tool.ts`
  - `packages/mcp/src/battle-handoff.ts`
  - `packages/mcp/src/session-store.ts`
- Existing session handoff already supports positive HP, unstable zero-HP, Stable, and dead closeout states.
- Shared death-save transitions live in `packages/shared-algebras/src/death-saves-algebra.ts`.

## Suggested Implementation Shape

- Knock Out could be represented as an attack-damage resolution choice that is only available for eligible melee attacks.
- The choice would likely belong near the attack damage boundary, before `applyHpDamage` finalizes zero-HP consequences.
- The HP mutation branch could apply when melee attack damage would reduce a non-terminal target from positive HP to 0 and massive damage does not kill outright. The result would be HP 1 plus Unconscious.
- Stat Block combatants could be Knocked Out under RAW creature wording; that would bypass `diesAtZeroHp` because the target never reaches 0 HP.
- The choice should not be a generic damage flag. Spells, save damage, falling, ongoing effects, and damage at 0 HP do not own this attacker choice.
- MCP handoff likely does not need a new zero-HP variant for Knock Out because the target remains at positive HP. Durable Short Rest recovery from positive-HP Unconscious would be a separate session/adventuring width concern.

## Invalid-State Risks

- A loose `nonlethal?: boolean` on HP damage would allow impossible combinations with ranged attacks, spells, and zero-HP damage.
- Modeling Knock Out as `0 HP + Stable` would contradict SRD 5.2.1 and conflate Stable with positive-HP Unconscious.
- A 1-HP Unconscious creature is not terminal. Act discovery should still block actions through Incapacitated/Unconscious, not through zero-HP terminal checks.

## Verification Suggestions

- RAW and UL check should explicitly resolve the Knock Out terminology mismatch.
- Focused battle-runtime tests:
  - melee Knock Out to 1 HP + Unconscious for Character target;
  - melee Knock Out to 1 HP + Unconscious for Stat Block target;
  - ranged attacks cannot carry the choice;
  - massive damage still kills a Character when applicable;
  - post-battle closeout does not add `zeroHpLifecycle` for a 1-HP Knocked Out target.
- QNT parity update should happen before runtime behavior change.
- MCP tests only seem needed if tool-visible Knock Out workflow or closeout changes.
- `/simplify` convergence remains required.
