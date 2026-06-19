# L3 Slow Runtime Survey

Task: `L3-SPELL-SLOW-RUNTIME-SURVEY`

## RAW And Language Check

Local RAW exists for SRD 5.2.1 Slow in
`.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Slow`. The spell is a
level-3 Transmutation spell with Magic Action casting, 120-foot range,
Concentration up to 1 minute, and up to six chosen creature targets in a
40-foot Cube within range. Each target makes a Wisdom Saving Throw; failed-save
targets are affected for the duration and repeat the save at the end of each of
their turns, ending the spell on themself on a success.

The runtime-visible failed-save clauses are:

- the target's Speed is halved;
- the target takes a -2 penalty to Armor Class and Dexterity Saving Throws;
- the target can't take Reactions;
- on the target's turns, it can take either an Action or a Bonus Action, not
  both;
- the target can make only one attack if it takes the Attack action;
- if the target casts a spell with a Somatic component, there is a 25 percent
  chance the spell fails because the target makes the spell's gestures too
  slowly.

`UBIQUITOUS_LANGUAGE.md` confirms the relevant terms: Magic Action, Spell Slot,
Concentration, Speed versus Movement, Armor Class, Saving Throw, Action, Bonus
Action, Reaction, Attack action, and Somatic components. It also distinguishes
the Slow spell from the Slow weapon Mastery Property, so runtime work must not
reuse mastery identity or dispatch on authored spell id.

## Current State

`slow` is present in the local SRD corpus and is now authored as an SRD
Surface Spell Definition in `packages/surface/content/slow.dhall` with
generated `packages/surface/content/slow.json`. It is imported by
`packages/surface/src/surface/unit-catalog.ts` and has a checker-visible
`unsupported-profile` claim in `plans/unit-profile-coverage/unit-claims.jsonl`
with runtime follow-ups split by owner.

Existing reusable pieces:

- Surface represents the 40-foot Cube chosen-target save boundary,
  Concentration, `set_speed_ratio`, `modify_ac`, Dexterity Saving Throw
  numeric modifiers through `modify_roll_numeric`, `restrict_action_usage` for
  Reactions, the target-turn Action-or-Bonus-Action choice, Attack-action
  attack caps, Somatic spell failure chance, and end-of-target-turn repeat
  saves.
- Surface and battle runtime have Reaction resources and spell-cast Reaction
  windows, but no active spell effect that suppresses all Reactions while the
  effect is present.
- Battle runtime can project scalar AC bonuses, d20 numeric roll modifiers, and
  additive Speed deltas from some spell profiles, but not an active Speed ratio
  penalty tied to a save-gated multi-target spell.
- The runtime has no typed owner for Somatic-component spell failure chance from
  an active hostile effect.

## Decision

Task 6 closes the missing authored record by installing the lossless Surface
Spell Definition and adding a Unit claim. The claim remains unsupported because
promoted battle-runtime support still needs the active-penalty and
target-turn/Somatic execution owners below. The claim keeps those facts separate
instead of collapsing Speed, Armor Class, Dexterity Saving Throw, Reaction,
Action/Bonus Action, Attack action, Somatic failure chance, and repeat Saving
Throw behavior into one opaque unsupported label.

Runtime admission must use typed spell procedure facts and active-effect support
profiles, not `spell.id === "slow"` or a reused weapon-mastery Slow identity.
No companion AI or autonomous-control behavior is needed: Slow restricts the
target's available action economy and spellcasting success, but it does not
choose actions for the target.

## Follow-Up Split

`L3-FOLLOWUP-SLOW-SURFACE-AUTHORING` (completed by `L5-D06-SLOW`)

Authored `packages/surface/content/slow.dhall` and generated JSON after adding
the missing Surface atoms. The record encodes Magic Action casting, level-3
Spell Slot, 120-foot range, V/S/M molasses component, Concentration up to 1
minute, up to six chosen creature targets in a 40-foot Cube, Wisdom save,
failed-save active Speed ratio 1/2, -2 AC, -2 Dexterity Saving Throw modifier,
no Reactions, Action-or-Bonus-Action mutual exclusion, Attack-action
one-attack cap, Somatic-component spell failure chance, and end-of-target-turn
repeat saves that end the spell on that target on success.

`L3-FOLLOWUP-SLOW-ACTIVE-PENALTIES-RUNTIME`

Promote Slow's save-gated active penalties after Surface authoring. Required
runtime work: Magic Action and level-3+ Spell Slot spend, caster-owned
Concentration, caller-supplied affected-creature set for the 40-foot Cube,
Wisdom save, failed-save active Speed ratio projection used by Movement and
Dash budgets, -2 Armor Class projection, -2 Dexterity Saving Throw modifier
with normal d20 modifier aggregation, no-Reaction projection, and
end-of-target-turn repeat saves that clean up only the successful target's Slow
effect. Required output: Supported-profile or profile-subset-supported Unit
claim, deterministic admission/projection evidence, focused runtime tests, and
promoted Quint/runtime parity without authored-identity dispatch.

`L3-FOLLOWUP-SLOW-TURN-AND-SOMATIC-RUNTIME`

Promote Slow's target-turn restrictions and Somatic failure chance after the
active effect lifecycle exists. Required runtime work: enforce the Action or
Bonus Action mutual-exclusion rule from active effect state, cap Attack-action
attacks at one for affected targets, and represent the 25 percent failure chance
for affected targets casting spells with Somatic components without adding
spell-id-specific gates. Required output: focused action-resource, Attack
action, spell component, chance-result, cleanup, and promoted Quint/runtime
parity tests.

## Verification Notes

Task 6 changes Surface catalog admission, Surface schema, and Unit coverage
inputs. The appropriate verification is Surface typecheck, focused Surface unit
catalog tests, unit-profile coverage check, `pnpm quality`, and whitespace
checking. It does not change runtime reducers or promoted Quint behavior, so MBT
is not appropriate for this task.
