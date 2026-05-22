# Level 3 Rules-Kernel Join Precheck

Task 24 surveyed the Level 3 spell-pressure seed against current Unit support
claims and rules-kernel joins. No runtime behavior changed.

## RAW And Vocabulary Check

- `.references/srd-5.2.1/Classes/*` Level 3 spell-list sections provide the
  class spell-pressure rows seeded by Task 23.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Counterspell` defines the
  Reaction interrupt, Constitution Saving Throw, slot preservation on
  interruption, and higher-slot automatic ending branch.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Dispel Magic` defines the
  level-3 Magic Action target, ongoing-spell ending, spellcasting ability check,
  and higher-slot automatic ending branch.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Fireball` defines the
  level-3 Dexterity save damage branch, half damage on success, slot scaling,
  and unattended flammable-object ignition fact.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md#Mass Healing Word` defines
  the level-3 Bonus Action healing profile and slot scaling.
- `.references/srd-5.2.1/Spells/Descriptions-Q-R.md#Ray of Enfeeblement`
  defines the Constitution save, success-side next attack roll Disadvantage,
  failed-save Strength-based D20 Test Disadvantage, failed-save damage-roll
  subtraction, end-turn repeat saves, and Concentration duration.
- `UBIQUITOUS_LANGUAGE.md` was checked for Spell Invocation, Spell Effect, Magic
  Action, Spell Slot, Reaction, D20 Test, Attack Roll, Ability Check, Saving
  Throw, Advantage, Disadvantage, and runtime/table ownership language.

## Join Survey

Installed Level 3 spell-pressure rows currently point at four already supported
or subset-supported Units:

| Unit | Current profile | Rules-kernel result |
| --- | --- | --- |
| `counterspell` | `spell.reaction-counterspell` | Already mapped to `BATTLE.SPELL.REACTION_CASTING_TIME` and `BATTLE.REACTION.OFFER_DECLINE_RESUME`; Task 25 remains the focused accounting audit for any Level 3 report wording or evidence gaps. |
| `dispel_magic` | `spell.invocation-ongoing-spell-ending` | Already mapped to `BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING`; Task 26 remains the focused accounting audit for broader ongoing-effect exclusions and Level 3 report wording. |
| `fireball` | `spell.invocation-damage-save-or-attack` | Already mapped to `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` and `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`; no Task 24 follow-up is needed. |
| `mass_healing_word` | `spell.hit-point-restoration` | Already mapped to `BATTLE.SPELL.HIT_POINT_RESTORATION`; no Task 24 follow-up is needed. |

The only current rules-kernel profile join gap was
`spell.invocation-ray-of-enfeeblement-d20-lifecycle`. Mapping it to the generic
roll-modifier obligation would overclaim because the supported slice also owns
Ray-specific save-success and save-failure branches, next-attack expiry,
Strength D20 Test projections, repeat saves, and Concentration cleanup. Task 24
therefore adds the focused covered obligation
`BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_D20_LIFECYCLE` and maps the profile to it.

The existing Unit claim still defers the failed-save `1d8` damage-roll
subtraction to `L12G-FOLLOWUP-RAY-OF-ENFEEBLEMENT-DAMAGE-PENALTY`; Task 24 does
not change that runtime boundary.

## Review Notes

- Round 1: direct mapping to `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` was
  rejected because it would hide the Ray-specific save branch and lifecycle
  obligations behind a generic roll-mode row.
- Round 2: the focused obligation keeps the supported D20 lifecycle exact and
  leaves the damage-roll subtraction follow-up unchanged.
- Round 3: no authored identity dispatch, companion control, autonomous
  behavior, duplicate state, or runtime reducer behavior was introduced.

## Verification For Implementation

- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
