# L3MMETA-10 Reroll Metamagic Boundary

## Scope

Task 10 resolves Empowered Spell and Seeking Spell as planned post-roll fill
owners. It does not promote new runtime behavior.

RAW and domain checks consulted:

- `.references/srd-5.2.1/Classes/Sorcerer.md#Empowered Spell`
- `.references/srd-5.2.1/Classes/Sorcerer.md#Seeking Spell`
- `.references/srd-5.2.1/Playing-the-Game.md#Making an Attack`
- `.references/srd-5.2.1/Playing-the-Game.md#Damage Rolls`
- `.references/srd-5.2.1/Rules-Glossary.md#Attack Roll`
- `.references/srd-5.2.1/Rules-Glossary.md#Spell Attack`
- `.references/srd-5.2.1/Spells/Descriptions-Q-R.md#Ray of Frost`
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Scorching Ray`
- `UBIQUITOUS_LANGUAGE.md#D20 Rolls`
- `UBIQUITOUS_LANGUAGE.md#Spell Ownership Terms` for Spell Invocation and
  Spell Effect ownership
- `UBIQUITOUS_LANGUAGE.md#Resource Consumption`

Empowered Spell costs 1 Sorcery Point when the caster rolls damage for a spell.
It rerolls a number of that spell's damage dice up to the caster's Charisma
modifier, minimum one die, and the replacement rolls must be used. Seeking
Spell costs 1 Sorcery Point after a spell Attack Roll misses. It rerolls the
d20 for that missed spell attack, and the replacement roll must be used.

Both options explicitly allow use even if the spell already used a different
Metamagic option during its casting. That is a stacking exception, not a reason
to treat either reroll as a cast-time property.

## Current Runtime Boundary

The current runtime truthfully rejects these options before Sorcery Point
spending:

- `packages/battle-runtime/src/battle-reducer/metamagic.ts`
- `packages/battle-runtime/src/battle-runtime-metamagic-resource.test.ts`

The evidence ledger already records
`L12G-FOLLOWUP-SORCERER-METAMAGIC-REROLL-OPTIONS` as
`accepted-runtime-closure`. The `sorcerer_metamagic` Unit claim keeps
Empowered and Seeking in deferred mechanics with an `outside-battle-runtime`
closure owner named "typed post-roll spell reroll fill boundary owner."

That boundary remains correct. The existing Spell Invocation Metamagic
admission path is cast-time: the caller selects Metamagic before the roll
sequence is known. Empowered and Seeking are post-roll decisions. Promoting
them through the cast-time subject would either ask the player to preselect a
decision RAW opens later, or store an inert opportunity that can diverge from
the roll being resolved.

## Owner Decision

Create typed post-roll fill owners for spell rerolls before opening support for
Empowered or Seeking.

The owner should be part of the roll continuation that already owns the
relevant pending hole:

- spell damage roll continuations for Empowered;
- spell Attack Roll miss continuations for Seeking.

Do not add a parallel registry keyed by spell id, spell name, provenance
section, procedure name, or Metamagic option identity. The runtime already has
typed selected Metamagic option facts from Character Battle. The post-roll
owner should read those facts from the actor's known options, check the shared
Sorcery Point pool at the moment the reroll fill is accepted, and then replace
the roll result in the same resolution branch.

Do not store durable reroll opportunity state on `BattleState`. The open
opportunity is the current awaiting roll continuation plus the fills already
submitted for that Spell Invocation. Persisting a second opportunity record
would duplicate state that can disagree with the pending attack or damage roll.

## Empowered Spell Shape

Empowered needs a damage-dice replacement fill, not a final damage override.

The future fill should carry:

- the source `rolledDice` hole being modified;
- one or more selected original spell damage dice from that hole;
- one replacement `DieRollResult` for each selected die;
- the selected Empowered Spell fact and its 1 Sorcery Point cost.

The selected original dice and replacement dice should be paired in one typed
value so mismatched counts are unrepresentable. The reducer should compute the
effective damage roll by replacing only those selected dice and then running
the ordinary damage total, Critical Hit, resistance, vulnerability, immunity,
and damage-rider flow. The original rolled-dice fill remains the table fact;
Empowered creates the execution-facing replacement projection for this
resolution.

The fill parser/support gate must enforce the Charisma-modifier limit at the
reroll boundary. The same boundary should treat minimum one as an eligibility
floor, not as permission to open an Empowered opportunity when no spell damage
dice were rolled.

Do not start with multi-damage-roll spells. Scorching Ray and later split-hit
procedures need invocation-local use accounting so one spell cannot accept a
second Empowered fill in another damage hole. That accounting should be derived
from the current Spell Invocation's accepted fills, not persisted as a battle
resource or spell-id registry.

Recommended first Empowered slice:

1. Add a typed spell damage dice reroll fill for a single `rolledDice` hole.
2. Thread it through the `spellAttackDamage` hit branch using Ray of Frost at a
   character level where the damage has at least two dice.
3. Enforce known option, affordability, stacking exception with a different
   cast-time Metamagic, Charisma-modifier selected-die limit, and forced use of
   replacement rolls before resource spending.
4. Verify the replacement projection changes damage while preserving the
   original Spell Definition, target, attack outcome, damage type, and ordinary
   post-damage effects.
5. Leave Scorching Ray, Magic Missile allocation, saving-throw area damage,
   ongoing damage, and multi-hole damage procedures closed until each owner has
   its own post-roll fill witness.

## Seeking Spell Shape

Seeking needs a missed spell Attack Roll replacement fill, not a generic
Advantage-like roll mode.

The future fill should carry:

- the source `attackRoll` hole whose current result missed;
- the replacement spell Attack Roll result to use for that same attack;
- the selected Seeking Spell fact and its 1 Sorcery Point cost.

The replacement result becomes the attack result for the existing attack
resolution. If it hits, the ordinary damage hole opens. If it misses, the miss
is final. The runtime must not choose the better result, keep the original hit
or miss if the replacement is worse, or let a replacement d20 inherit a stale
Critical Hit or natural-1 miss conclusion from the original roll.

Seeking is spell-attack-only. It must not apply to weapon attacks, spell Saving
Throws, ability checks, Magic Missile, or other no-attack spell damage.

Do not start with multi-attack spells. Scorching Ray has one spell with several
spell Attack Rolls. A later Scorching Ray slice must make it impossible to
spend Seeking twice on the same Spell Invocation while still allowing the one
Seeking use to attach to the missed ray that actually opened the opportunity.

Recommended first Seeking slice:

1. Add a typed missed spell attack reroll fill for one `attackRoll` hole.
2. Thread it through `spellAttackDamage` using Ray of Frost: initial miss opens
   the Seeking opportunity, the replacement result is forced, and a replacement
   hit opens the existing damage hole.
3. Enforce known option, affordability, stacking exception with a different
   cast-time Metamagic, missed-original-roll eligibility, and spell-attack-only
   scope before resource spending.
4. Verify replacement miss, replacement hit, natural-1 replacement miss, and
   replacement Critical Hit behavior.
5. Leave Scorching Ray and other repeated spell-attack procedures closed until
   invocation-local one-use accounting exists for post-roll rerolls.

## Stacking And Timing

The existing Metamagic admission core already models the stacking exception for
an option whose `stackingMode` is `can_combine_with_different_metamagic`.
Post-roll reroll owners must preserve that fact without reopening arbitrary
multi-Metamagic combinations.

The safe protocol is:

1. Cast-time Metamagic options continue to be selected through the Spell
   Invocation subject when their RAW timing is "when you cast."
2. Empowered and Seeking are not selected at cast time. Their opportunities are
   offered only by the roll owner after the triggering roll exists.
3. The post-roll owner checks whether the Spell Invocation already used a
   different Metamagic option. A different option is allowed; the same reroll
   option repeated for the same Spell Invocation is not.
4. Sorcery Points are spent only if the reroll fill is accepted.

This keeps the stackable exception executable without storing a second copy of
the Spell Invocation's selected option list.

## Plan Impact

Task 10 should be marked done as a boundary resolution. No existing runtime
profile should be promoted by this task.

The future implementation work should be split:

- Seeking first-slice task: typed missed spell attack reroll fill plus one
  Ray of Frost `spellAttackDamage` witness.
- Empowered first-slice task: typed spell damage dice reroll fill plus one
  single-damage-hole `spellAttackDamage` witness.

Scorching Ray should remain deferred until at least one single-attack or
single-damage-hole slice establishes the post-roll fill pattern. Its repeated
attack and repeated damage holes require invocation-local one-use accounting
for both reroll options.

## Verification Guidance

No MBT run is needed for this boundary task because no runtime behavior changed.

Future implementation slices should verify with focused runtime tests, focused
QNT owner tests, selected-identity MBT only after runtime and QNT witnesses
exist, and then:

- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check -- --write`
- `pnpm rules-kernel-coverage:check`
- `pnpm quality`
