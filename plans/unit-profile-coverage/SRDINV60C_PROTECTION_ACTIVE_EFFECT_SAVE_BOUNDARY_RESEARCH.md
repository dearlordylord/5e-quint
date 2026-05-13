# SRDINV60C Protection from Evil and Good Active-Effect Save Boundary Research

Task 290 reviewed Protection from Evil and Good's active-effect Saving Throw
Advantage clause. No runtime behavior was implemented in this task.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md` lines 907-916 for
  Protection from Evil and Good.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 221-227 for Charmed.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 488-494 for Frightened.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 794-796 for Possession.
- `.references/srd-5.2.1/Rules-Glossary.md` lines 854-856 for Saving Throw.
- `UBIQUITOUS_LANGUAGE.md` lines 1-21, 95-101, and 343-344 for Saving
  Throw, Advantage, Charmed, and Frightened vocabulary.

Relevant RAW facts:

- Protection from Evil and Good protects one willing touched creature from
  Aberrations, Celestials, Elementals, Fey, Fiends, and Undead.
- The protected target has Advantage on any new Saving Throw only when the
  target is already possessed, Charmed, or Frightened by such a creature and
  the new Saving Throw is against the relevant effect.
- Charmed and Frightened are condition states with source-sensitive rules.
- Possession is effect-defined; the Possession glossary does not provide a
  generic repeat-save cadence.
- Saving Throws happen when a rule requires one. The runtime should not create
  a synthetic Saving Throw for an effect whose SRD text has no future save.

Additional relevant active-effect source texts checked:

- Magic Jar in `.references/srd-5.2.1/Spells/Descriptions-M-P.md` lines 64-77:
  Protection from Evil and Good prevents the possession attempt before the
  failed-save possession applies. The later host-body-death save is made by the
  possessor against the possessor's own spellcasting DC, not by the protected
  possessed target against the possession effect.
- Compulsion in `.references/srd-5.2.1/Spells/Descriptions-A-D.md` lines
  899-903: Charmed targets repeat the save after forced movement.
- Fear in `.references/srd-5.2.1/Spells/Descriptions-E-L.md` lines 268-279:
  Frightened targets repeat the save at end of turn when line of sight to the
  caster is absent.
- Dominate Beast, Dominate Monster, and Dominate Person in
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md` lines 1645-1685:
  Charmed targets repeat the save when they take damage.
- Weird in `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` lines
  1283-1294: Frightened targets repeat the save at the end of each turn.

## Existing Boundary

The promoted battle runtime has several `savingThrowOutcome` holes with live
effect identity:

- Sleep repeat saves carry target, source spell, source combatant, and save
  facts, but the effect is Sleep-owned Incapacitated/Unconscious, not Charmed,
  Frightened, or possession.
- Searing Smite-style turn-start damage saves carry source spell and source
  combatant facts, but the save is against ongoing damage, not one of the
  relevant Protection from Evil and Good effects.
- Grease ground-hazard saves carry source spell, source combatant, area id, and
  trigger, but they are area-entry/end-turn saves against Prone.
- Fresh spell-cast `saveGatedCondition` holes are initial application saves.
  They are not "new saving throws" against an already-applied Charmed or
  Frightened effect.

SRDINV60B already added a focused negative test that an active Charmed effect
beside a fresh Charm Person save hole does not cause Protection from Evil and
Good Advantage to project onto that fresh spell-cast save. That is still the
correct production behavior.

## Boundary Decision

There is no current promoted production save boundary that is both:

- a new Saving Throw against an already-applied possession, Charmed, or
  Frightened effect; and
- typed with the relevant effect's target, source spell, source combatant, live
  effect identity, and source creature-type evidence.

Do not wire Protection from Evil and Good into the existing fresh spell-cast
condition save holes. Doing so would let the protected target receive Advantage
from a stale active effect, a wrong source spell, a wrong source combatant, or
an unscoped source creature type, and would also apply to initial saves that RAW
does not cover.

The future boundary belongs to the owning effect profile that creates the
future save, not to a Protection-specific adapter. For example, a future
Dominate/Fear/Compulsion/Weird repeat-save profile should create a
typed active-effect save hole from the live Charmed or Frightened effect. At
that boundary, Protection from Evil and Good can derive Advantage from the
protected target's live `creatureTypeProtection` effect and the owning effect's
source combatant creature type.

Magic Jar does not provide the first implementation boundary for this clause.
Protection from Evil and Good already prevents its possession attempt before
possession applies, and the later save in Magic Jar is not the protected
target's save against an already-applied possession effect.

## Follow-Up Runtime Shape

When an owning Charmed or Frightened repeat-save profile is promoted, the save
hole should be modeled with one effect-owned evidence object rather than
parallel lookup state. It needs to carry at least:

- target id;
- source spell id;
- source combatant id;
- relevant effect kind: Charmed, Frightened, or possession;
- save ability and DC from the owning effect;
- the event cadence that RAW names for that owning effect.

Protection from Evil and Good's Advantage projection should then require:

- the target has a live `creatureTypeProtection` active effect;
- the source combatant still exists and has a protected creature type;
- the active effect being saved against has the same target id, source spell id,
  and source combatant id as the save hole;
- the save hole is a future save against the already-applied relevant effect,
  not the initial spell-cast save.

The runtime should keep this derivable from live active effects. Do not add a
second "protected save source" registry or store duplicate creature-type facts
on the save hole when the source combatant's retained stat block can provide
the creature type at projection time.

## Plan Impact

- SRDINV60C can close as research complete.
- SRDINV66 should be unblocked by SRDINV60C and should treat the Protection
  from Evil and Good save-Advantage clause as a classified future owner gap,
  not as incomplete current runtime work.
- The first implementation owner should be whichever future task promotes a
  real Charmed/Frightened repeat-save profile, likely a Dominate/Fear/
  Compulsion/Weird family task. That task should include the Protection from
  Evil and Good projection in the same slice if it creates the typed active
  effect save hole.
- Protection from Evil and Good remains profile-subset-supported. Its deferred
  save-Advantage mechanic should point at SRDINV66 until the decider appends a
  concrete owning-effect runtime task.

## /simplify Convergence

- Round 1: rejected a Protection-specific synthetic save helper. The SRD
  clause modifies a Saving Throw created by the relevant already-applied effect;
  it does not create an independent save.
- Round 2: rejected projecting onto fresh spell-cast condition saves or
  duplicating source/effect state. The future roll mode can be derived from a
  live protection effect plus the owning effect's typed save hole.
