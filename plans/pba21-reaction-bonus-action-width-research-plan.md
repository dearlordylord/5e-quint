# PBA21 Research Plan - Reaction Windows And Bonus-Action Subjects

Task: PBA21 - Broaden Reaction Windows And Bonus-Action Subjects

Status: pre-researched. This file is planning evidence and implementation guidance only.

## Research Inputs

- RAW lens: Reaction, Bonus Action, Opportunity Attack, Ready, Deflect Attacks, Shield, Counterspell, Hellish Rebuke, Bonus Action spells, and granted-reaction effects.
- Ubiquitous-language lens: Reaction trigger, runtime window kind, Decline, Bonus Action, and resource terms.
- Architecture lens: reaction window/interrupt stack, turn resources, bonus-action subjects, PBA14D follow-ups, and PBA20 spell dependencies.

## RAW Anchors

- `.references/srd-5.2.1/Playing-the-Game.md`: Bonus Action, Reaction, Opportunity Attack.
- `.references/srd-5.2.1/Rules-Glossary.md`: Incapacitated, Opportunity Attack, Ready, Reaction.
- `.references/srd-5.2.1/Classes/Monk.md`: Deflect Attacks and Deflect Energy.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`: Shield, Shield of Faith, Wall of Stone.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`: Counterspell.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`: Hellish Rebuke, Healing Word, Find Familiar.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`: Mass Healing Word, Misty Step, Power Word Heal.

## Ubiquitous Language Findings

- RAW Reaction trigger clauses, runtime Reaction window kinds, and admitted Reaction procedure choices should remain distinct.
- Runtime `BATTLE_REACTION_TRIGGERS` are closer to window kinds than authored trigger text.
- Opportunity Attack has before-the-creature-leaves-reach timing, unlike normal
  after-trigger reactions; the reach-exit fact itself comes from the table.
- Bonus Action is a turn-scoped allowance granted by a rule, not an interrupt window.
- `Decline` is the canonical player choice when not taking an offered Reaction.

## Architecture Findings

- Relevant files:
  - `packages/battle-runtime/src/index.ts`
  - `packages/battle-runtime/src/battle-runtime.mbt.test.ts`
  - `packages/battle-runtime/README.md`
  - `packages/surface/src/surface/schema-spell.ts`
  - `packages/surface/src/surface/schema-nonspell.ts`
  - `packages/shared-algebras/src/action-economy-algebra.ts`
- Runtime reaction windows currently include `attackHit`, `attackDamage`, `spellCast`, `saveFailed`, `afterDamage`, and `opportunityAttack`.
- Main Attack opens hit/damage/after-damage windows. Off-Hand Attack and Opportunity Attack currently resolve damage directly.
- `BattleInterruptedProcedure.attackDamage.subject` is main-Attack-specific.
- Current MBT rejects `reactionDecision` holes; high-risk interrupt-stack widening may need promoted MBT bridge work.
- Bonus Action runtime subjects are narrow: off-hand attack and Hide. Unit features use `unitFeature`; spell subjects are action-spell only.

## Suggested Implementation Shape

- A first slice could create a shared attack-resolution host model for main Attack, Off-Hand Attack, and Opportunity Attack.
- `BattleInterruptedProcedure.attackDamage.subject` could widen to a named attack-host subject union rather than gaining parallel continuation variants.
- Off-Hand Attack and Opportunity Attack could then open the same attack-hit, attack-damage, and after-damage windows as main Attack, while preserving host-specific resource spend.
- Deflect redirect-on-zero could be modeled as a second-stage reaction continuation: reduction first, then a follow-up target/save/damage hole only when final damage reaches zero and a legal redirect target exists.
- Bonus Action spell subjects could be a `bonusActionSpell` lane parallel to `actionSpell`, sharing spell act parsing, slot spend, targeting holes, Spell Cast reaction windows, and Concentration handling where applicable.
- "Target may use its Reaction" effects, such as Power Word Heal or Wall of Stone, look distinct from caster-owned reaction spells and could become a granted-reaction window procedure.
- Stat Block Bonus Actions should remain Stat Block part support profiles, not generic Bonus Action branches.

## Risks

- Nested Opportunity Attack reaction continuation is high risk because OA itself is a Reaction and the OA attack may open attack-hit or attack-damage Reactions.
- Deflect redirect-on-zero is not representable by the current half/rolled reduction choice alone.
- Broad Bonus Action spells are blocked behind PBA20 because spell casting-time/resource shape should be admitted first.
- Adding subjects without support-profile admission would violate the runtime support-profile discipline.

## Verification Suggestions

- RAW checks for every selected pressure case.
- Focused runtime tests for:
  - Off-Hand Attack opening main-Attack-equivalent reaction windows;
  - Opportunity Attack nested continuation and movement resume;
  - correct reactor resource spend;
  - Deflect reduction and redirect gating;
  - Bonus Action spell resource spend and timing.
- MCP pending-state replay tests for new Reaction and Bonus Action subjects.
- Promoted QNT/MBT if interrupt-stack or continuation model changes.
- `/simplify` convergence remains required.
