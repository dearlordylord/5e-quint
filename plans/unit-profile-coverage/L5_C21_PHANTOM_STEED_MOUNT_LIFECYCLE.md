# L5-C21 Phantom Steed Mount Lifecycle

Task 21 rechecked Phantom Steed after the SRD-provenance Surface Spell
Definition was authored. This task does not promote battle-runtime execution;
it makes the owner split explicit and adds the missing typed Surface fact for
the damage-triggered early spell end.

## Source Review

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md#Phantom Steed`: Large
  horselike creature, unoccupied point placement within 30 feet, caster-chosen
  appearance, saddle/bit/bridle creation, equipment distance vanish, chosen
  rider permission, Riding Horse stat-block reference, Speed 100 override,
  13 miles/hour travel, gradual fade with 1-minute rider dismount grace, and
  early spell end when the steed takes any damage.
- `.references/srd-5.2.1/Classes/Wizard.md:254`: Phantom Steed appears on the
  Wizard level-3 spell list as a Ritual.
- `.references/srd-5.2.1/Playing-the-Game.md#Travel Pace`: ordinary travel pace
  and mounted travel are table-facing travel facts, not battle-map state.
- `.references/srd-5.2.1/Playing-the-Game.md#Mounted Combat`: controlled and
  independent mount rules own rider/control action economy.
- `UBIQUITOUS_LANGUAGE.md`: Companion, Companion Control, Companion Execution,
  Travel Pace, Controlled Mount, Independent Mount, Mounting/Dismounting,
  Speed, Movement, and Spell Effect vocabulary.

## Outcome

Surface now distinguishes Phantom Steed's damage trigger from ordinary 0 HP
disappearance:

- `dismissal.onSpawnedCreatureDamage = "spell_ends"` records that any damage to
  the spawned creature ends the spell.
- `dismissal.onSpellEnd.kind = "gradual_fade"` remains the cleanup path, with
  the 1-minute rider dismount grace.

No promoted runtime profile is claimed. The remaining executable work is split
in `plans/unit-profile-coverage/unit-claims.jsonl`:

- `L3-FOLLOWUP-PHANTOM-STEED-MOUNT-LIFECYCLE`: spell-created mount occurrence,
  caller-supplied unoccupied placement, Riding Horse catalog stat-block
  projection with the Speed override, chosen-rider permission, damage-triggered
  spell end, and gradual fade/dismount grace.
- `L3-FOLLOWUP-PHANTOM-STEED-CREATED-EQUIPMENT`: saddle/bit/bridle object or
  equipment occurrences and the 10-foot carried-distance vanish boundary.
- `L3-FOLLOWUP-PHANTOM-STEED-TRAVEL-PACE`: the 13 miles/hour travel fact through
  a table travel owner.

These owners must consume typed Surface/profile facts and explicit table
witnesses. They must not copy the Riding Horse stat block, table geometry,
travel state, equipment state, or Phantom Steed authored identity into generic
runtime behavior.

## Reviewer Loop

- RAW/ubiquitous-language pass: no SRD clause is promoted beyond the local SRD
  text. Damage-triggered spell ending is typed as a spell-end trigger, not as
  0 HP disappearance.
- Architecture/connascence pass: the strong coupling between the damage trigger
  and gradual fade cleanup is localized in `CreatureDismissal`; future runtime
  work should route damage-triggered ending through spell-end cleanup instead
  of adding a parallel disappearance path.
- Code-review pass: no battle-runtime, QNT, or MBT behavior changed in this
  task. The coverage claim remains `unsupported-profile` until a real owner
  exists.
