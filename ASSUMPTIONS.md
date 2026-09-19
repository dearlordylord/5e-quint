# Modeling Assumptions

This document records choices required where the SRD is silent, ambiguous, or
does not define a boundary needed by the model. Each entry states the choice
and its SRD 5.2.1 basis or gap.

## A1: Spell invocation requires ability to act

**Assumption:** A spell invocation can spend its spell resource and start
Concentration only when the caster has Hit Points above 0 and can take the
required action.

**Rules basis / gap:** `.references/srd-5.2.1/Rules-Glossary.md`,
"Incapacitated [Condition]" says that an Incapacitated creature cannot take an
Action, Bonus Action, or Reaction, and "Concentration" says that Incapacitated
or Dead ends Concentration. `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`,
"Casting Time" specifies whether the applicable spell requires a Magic Action,
Bonus Action, Reaction, or longer casting time.
`.references/srd-5.2.1/Playing-the-Game.md`, "Dropping to 0 Hit Points" and
"Falling Unconscious" establish
that reaching 0 Hit Points makes a creature Unconscious and subject to the
Death Saving Throw lifecycle.
The SRD does not state separately that a spell slot cannot be spent when the
caster cannot take the required action. The model applies that consequence to
slot expenditure and starting Concentration.

## A2: Turn completion is a timing boundary

**Assumption:** Completing a creature's turn provides the boundary for effects
that occur at the end of that turn and for advancing Initiative.

**Rules basis / gap:** `.references/srd-5.2.1/Playing-the-Game.md`, "Combat"
describes rounds and turns, and the SRD uses "at the end of your turn" as a
timing phrase throughout spell and feature descriptions. It does not define a
separate action for completing a turn. The boundary is a model timing
decision, not an additional player action.

## A4: A round is the model's smallest elapsed-time unit

**Assumption:** For rule-duration conversion, the model treats a round as a
six-second tick and does not represent sub-round elapsed time. Time-span
conversions count whole rounds without prorating a round based on initiative
position. A battle summary must not multiply the highest round reached by six:
that round can be incomplete, and the SRD's six seconds is approximate.

**Rules basis / gap:** `.references/srd-5.2.1/Playing-the-Game.md`, "Combat"
says that a round represents about 6 seconds and that each participant takes a
turn during it. The SRD does not define partial-round elapsed-time accounting
for a turn-resolution model, so the model uses the round as its smallest clock
unit.

## A8: Two-Weapon Fighting uses melee weapons

**Assumption:** The model permits the Light-property extra attack only when
both weapons are Light melee weapons.

**Rules basis / gap:** `.references/srd-5.2.1/Equipment.md`, "Light" permits an
extra attack with a different Light weapon, but does not say that the weapons
must be melee weapons. The melee-only restriction is therefore a deliberate
interpretation of that omission, not a quoted SRD requirement.

## A17: Standing from Prone requires a nonzero movement expenditure

**Assumption:** Standing from Prone is unavailable when half the creature's
Speed, rounded down, is zero; the attempt is a no-op in that case.

**Rules basis / gap:** `.references/srd-5.2.1/Rules-Glossary.md`, "Prone" says
to spend movement equal to half Speed, rounded down, and separately says that
Speed 0 prevents righting. It does not say whether a Speed of 1, whose rounded
cost is zero, permits standing. The model interprets "spend" as requiring a
nonzero expenditure.

## A26: Stable recovery timers do not cross the battle handoff boundary

**Assumption:** A battle handoff may preserve a fresh Stable zero-Hit-Point
state, but it does not carry partially elapsed Stable recovery time across the
boundary. The Stable creature's calendar-time recovery remains owned by the
non-battle state that tracks that clock.

**Rules basis / gap:** `.references/srd-5.2.1/Rules-Glossary.md`, "Stable" and
`.references/srd-5.2.1/Playing-the-Game.md`, "Damage and Healing" say that a
Stable creature at 0 Hit Points regains 1 Hit Point after 1d4 hours if it is
not healed. The SRD does not define how partially elapsed hours are projected
when a creature enters or leaves battle, so the handoff boundary is a model
choice.

## A27: Active Wild Shape does not cross the character-sheet handoff boundary

**Assumption:** A character-sheet handoff requires Wild Shape to have ended; an
active Beast form is not projected as durable character-sheet state.

**Rules basis / gap:** `.references/srd-5.2.1/Classes/Druid.md`, "Level 2:
Wild Shape" defines the form's duration and ending conditions, including the
option to leave it as a Bonus Action. The SRD does not define a protocol for
writing a durable character sheet while the character remains in Beast form,
so the handoff boundary requires reversion first.

## A33: Mid-combat roster and initiative changes are caller decisions

**Assumption:** Creatures may enter or leave the modeled combat at any time; an
arriving creature receives caller-supplied Initiative; creatures remain in the
initiative representation until the caller removes them. A summoned creature
uses an explicit summoning rule when one exists, otherwise its Initiative is
caller-supplied.

**Rules basis / gap:** `.references/srd-5.2.1/Playing-the-Game.md`, "Combat"
says that participants roll Initiative at the beginning of combat and that the
Initiative order remains the same from round to round. The SRD does not define
mid-combat arrival, departure, or a universal summoning initiative procedure.
Those roster and ordering decisions are therefore outside the RAW-defined
combat sequence.

## A43: Scalar reductions on mixed damage are allocated proportionally

**Assumption:** A scalar reduction applied to a mixed-damage roll is allocated
proportionally among the pre-adjustment damage entries. Largest-remainder
allocation resolves integer remainders, ties preserve authored entry order,
and the allocated total is capped at total damage.

**Rules basis / gap:** `.references/srd-5.2.1/Rules-Glossary.md`, "Damage
Types" defines typed damage. `.references/srd-5.2.1/Playing-the-Game.md`,
"Resistance and Vulnerability" and its "Order of Application" subsection say
that adjustments are applied before Resistance and Vulnerability. The SRD does
not specify how one scalar adjustment is split among multiple damage types. The
allocation rule is a deterministic model choice and does not change the
ordering of the SRD's damage adjustments.

## A44: Stat Block Multiattack dispatch is a named-attack continuation

**Assumption:** Once a Stat Block Multiattack is selected, its named attack
dispatches remain the open Attack action. Until the dispatches are spent or the
turn ends, Movement between attacks and turn completion remain available; unrelated
actions, Bonus Actions, spells, features, and unrelated reaction or Legendary
Action subjects are not part of that continuation.

**Rules basis / gap:** `.references/srd-5.2.1/Monsters/Overview.md`,
"Multiattack" says that the listed attacks and additional abilities are part of
the Attack action. `.references/srd-5.2.1/Rules-Glossary.md`, "Attack [Action]"
allows movement between multiple attacks, while
`.references/srd-5.2.1/Playing-the-Game.md`, "Bonus Actions" leaves the timing
of an available Bonus Action to the creature unless specified. The SRD does
not define a replay or interleaving protocol for a partially resolved named
Multiattack, so the continuation boundary is explicit model policy.

## A46: An owner's Long Rest does not restore a surviving retained companion

**Assumption:** A surviving retained Find Familiar-like companion is unchanged
by its owner's Long Rest, including Hit Points and Temporary Hit Points. A
Wild Companion familiar disappears when its owner finishes a Long Rest, and a
companion already disappeared at 0 Hit Points remains disappeared.

**Rules basis / gap:** `.references/srd-5.2.1/Rules-Glossary.md`, "Long Rest"
and `.references/srd-5.2.1/Playing-the-Game.md`, "Temporary Hit Points" tie
restoration and Temporary Hit Point expiry to the creature that finishes the
rest. `.references/srd-5.2.1/Classes/Druid.md`, "Level 2: Wild Companion"
explicitly says that this familiar disappears when the Druid finishes a Long
Rest. The SRD does not say that an ordinary familiar participates in its
owner's rest, so the retained companion remains unchanged.

## A47: Recasting a retained companion preserves its identity and carries Hit Points

**Assumption:** Recasting Find Familiar while a familiar exists changes that
familiar's form rather than creating another identity. A living or dismissed
familiar carries its Hit Points clamped to the new form's maximum and keeps
Temporary Hit Points; a familiar that disappeared at 0 Hit Points reappears
with the new form's full Hit Points and no Temporary Hit Points. The casting
route supplies the companion's protocol. Recasting or reappearing the same
familiar during an encounter carries its Reaction availability; changing form
or manifestation does not start the familiar's next turn.

**Rules basis / gap:** `.references/srd-5.2.1/Spells/Descriptions-E-L.md`,
"Find Familiar" says that only one familiar can exist, that recasting causes
it to adopt a new eligible form, and that a familiar at 0 Hit Points reappears
after the spell is cast again. `.references/srd-5.2.1/Classes/Druid.md`,
"Level 2: Wild Companion" defines a distinct route that casts Find Familiar
without Material components and makes the familiar Fey. Neither source
specifies Hit Point carry-over, reappearance Hit Points, Temporary Hit Points,
Reaction carry-over, or persistence of a casting route's companion protocol.
Those details are explicit model choices.

## A49: Enlarge/Reduce creature effects are target-exclusive

**Assumption:** For the creature-target branch of Enlarge/Reduce, a new casting
replaces the target's existing Enlarge/Reduce size-change effect, including when
it switches between Enlarge and Reduce. At most one such effect contributes
active Size, Strength roll modes, and attack damage adjustment for a target.

**Rules basis / gap:** `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`,
"Combining Spell Effects" says that effects of the same spell cast multiple
times do not combine, and that the most recent effect applies when the castings
are equally potent. `.references/srd-5.2.1/Spells/Descriptions-E-L.md`,
"Enlarge/Reduce" defines the distinct Enlarge and Reduce creature projections
but does not specify how opposite-mode castings are compared or how their
active projections transition, so the target-exclusive replacement rule is an
explicit model choice for that gap.

## A50: Mixed-damage Frenzy is a Table Decision

**Assumption:** A Strength-based Stat Block attack with multiple damage types
still triggers Frenzy. When its authored base damage components contain more
than one distinct damage type, the table chooses the extra Frenzy dice's type
from exactly those distinct types. A single distinct type is automatic.

**Rules basis / gap:** `.references/srd-5.2.1/Classes/Barbarian.md`, "Level 3:
Frenzy" applies extra damage to the first target hit with a Strength-based
attack and says that the extra damage has the same type as the weapon or
Unarmed Strike used. The SRD does not select one type when a Stat Block attack
deals multiple damage types. The explicit Table Decision preserves the SRD's
same-type constraint without inferring an authored-order tie-breaker.

## A51: Hypnotic Pattern physical shake reachability is a Table Decision

**Assumption:** Ending Hypnotic Pattern by shaking an affected creature requires
an exact caller-supplied witness that the acting creature can physically shake
that affected creature at the time of the Action. The witness does not impose a
numeric distance and is bound to that actor-target pair.

**Rules basis / gap:** `.references/srd-5.2.1/Spells/Descriptions-E-L.md`,
"Hypnotic Pattern" says that the effect ends for an affected creature if
someone else uses an Action to shake the creature out of its stupor. Unlike
`.references/srd-5.2.1/Spells/Descriptions-S-Z.md`, "Sleep," which explicitly
requires someone within 5 feet, Hypnotic Pattern specifies no distance or
general reachability procedure. Whether the acting creature can perform the
physical shake is therefore supplied by the Table without authoring a distance.
