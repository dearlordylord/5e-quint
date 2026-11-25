# Modeling Assumptions

This document records choices required where the SRD is silent, ambiguous, or
does not define a boundary needed by the model. Each entry states the choice
and its SRD 5.2.1 basis or gap.

## A1: Spell invocation requires ability to act

**Assumption:** A spell invocation can spend its spell resource and start
Concentration only when the caster has Hit Points above 0 and can take the
required action.

**Rules basis / gap:** `.references/srd-5.2.1/rules-glossary.md`,
"Incapacitated [Condition]" says that an Incapacitated creature cannot take an
Action, Bonus Action, or Reaction, and "Concentration" says that Incapacitated
or Dead ends Concentration. `.references/srd-5.2.1/spells.md`,
"Casting Time" specifies whether the applicable spell requires a Magic Action,
Bonus Action, Reaction, or longer casting time.
`.references/srd-5.2.1/playing-the-game.md`, "Dropping to 0 Hit Points" and
"Falling Unconscious" establish
that reaching 0 Hit Points makes a creature Unconscious and subject to the
Death Saving Throw lifecycle.
The SRD does not state separately that a spell slot cannot be spent when the
caster cannot take the required action. The model applies that consequence to
slot expenditure and starting Concentration.

## A2: Turn completion is a timing boundary

**Assumption:** Completing a creature's turn provides the boundary for effects
that occur at the end of that turn and for advancing Initiative.

**Rules basis / gap:** `.references/srd-5.2.1/playing-the-game.md`, "Combat"
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

**Rules basis / gap:** `.references/srd-5.2.1/playing-the-game.md`, "Combat"
says that a round represents about 6 seconds and that each participant takes a
turn during it. The SRD does not define partial-round elapsed-time accounting
for a turn-resolution model, so the model uses the round as its smallest clock
unit.

## A8: Two-Weapon Fighting uses melee weapons

**Assumption:** The model permits the Light-property extra attack only when
both weapons are Light melee weapons.

**Rules basis / gap:** `.references/srd-5.2.1/equipment.md`, "Light" permits an
extra attack with a different Light weapon, but does not say that the weapons
must be melee weapons. The melee-only restriction is therefore a deliberate
interpretation of that omission, not a quoted SRD requirement.

"Melee weapon" here is the weapon's category, not how the attack is made. A
Light Melee weapon thrown with the Thrown property (a Dagger) is still a Melee
weapon, so its thrown ranged attack can make or follow the extra attack.

## A17: Standing from Prone requires a nonzero movement expenditure

**Assumption:** Standing from Prone is unavailable when half the creature's
Speed, rounded down, is zero; the attempt is a no-op in that case.

**Rules basis / gap:** `.references/srd-5.2.1/rules-glossary.md`, "Prone" says
to spend movement equal to half Speed, rounded down, and separately says that
Speed 0 prevents righting. It does not say whether a Speed of 1, whose rounded
cost is zero, permits standing. The model interprets "spend" as requiring a
nonzero expenditure.

## A26: Stable recovery timers do not cross the battle handoff boundary

**Assumption:** A battle handoff may preserve a fresh Stable zero-Hit-Point
state, but it does not carry partially elapsed Stable recovery time across the
boundary. The Stable creature's calendar-time recovery remains owned by the
non-battle state that tracks that clock.

**Rules basis / gap:** `.references/srd-5.2.1/rules-glossary.md`, "Stable" and
`.references/srd-5.2.1/playing-the-game.md`, "Damage and Healing" say that a
Stable creature at 0 Hit Points regains 1 Hit Point after 1d4 hours if it is
not healed. The SRD does not define how partially elapsed hours are projected
when a creature enters or leaves battle, so the handoff boundary is a model
choice.

## A27: Active Wild Shape does not cross the character-sheet handoff boundary

**Assumption:** A character-sheet handoff requires Wild Shape to have ended; an
active Beast form is not projected as durable character-sheet state.

**Rules basis / gap:** `.references/srd-5.2.1/classes.md`, "Level 2:
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

**Rules basis / gap:** `.references/srd-5.2.1/playing-the-game.md`, "Combat"
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

**Rules basis / gap:** `.references/srd-5.2.1/rules-glossary.md`, "Damage
Types" defines typed damage. `.references/srd-5.2.1/playing-the-game.md`,
"Resistance and Vulnerability" and its "Order of Application" subsection say
that adjustments are applied before Resistance and Vulnerability. The SRD does
not specify how one scalar adjustment is split among multiple damage types. The
allocation rule is a deterministic model choice and does not change the
ordering of the SRD's damage adjustments.

## A44: Stat Block Multiattack dispatch is a named-attack continuation

**Assumption:** Once a Stat Block Multiattack is selected, its named attack
dispatches remain the open Attack action. Until the dispatches are spent or the
turn ends, Movement (including Standing from Prone), voluntary Dropping Prone
between completed attacks, and turn completion remain available; unrelated
actions, Bonus Actions, spells, features, and unrelated reaction or Legendary
Action subjects are not part of that continuation.

**Rules basis / gap:** `.references/srd-5.2.1/monsters.md`,
"Multiattack" says that the listed attacks and additional abilities are part of
the Attack action. `.references/srd-5.2.1/rules-glossary.md`, "Attack [Action]"
allows movement between multiple attacks. Its "Prone" entry identifies
righting yourself by spending half your Speed as a movement option, so Standing
from Prone retains that permission when enough movement remains.
`.references/srd-5.2.1/playing-the-game.md`, "Dropping Prone," permits voluntarily
becoming Prone on the creature's turn without an action or any Speed expenditure;
the continuation preserves that permission between fully resolved attacks.
Meanwhile,
`.references/srd-5.2.1/playing-the-game.md`, "Bonus Actions" leaves the timing
of an available Bonus Action to the creature unless specified. The SRD does
not define a replay or interleaving protocol for a partially resolved named
Multiattack, so the continuation boundary is explicit model policy.

## A46: An owner's Long Rest does not restore a surviving retained companion

**Assumption:** A surviving retained Find Familiar-like companion is unchanged
by its owner's Long Rest, including Hit Points and Temporary Hit Points. A
Wild Companion familiar disappears when its owner finishes a Long Rest, and a
companion already disappeared at 0 Hit Points remains disappeared.

**Rules basis / gap:** `.references/srd-5.2.1/rules-glossary.md`, "Long Rest"
and `.references/srd-5.2.1/playing-the-game.md`, "Temporary Hit Points" tie
restoration and Temporary Hit Point expiry to the creature that finishes the
rest. `.references/srd-5.2.1/classes.md`, "Level 2: Wild Companion"
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

**Rules basis / gap:** `.references/srd-5.2.1/spells.md`,
"Find Familiar" says that only one familiar can exist, that recasting causes
it to adopt a new eligible form, and that a familiar at 0 Hit Points reappears
after the spell is cast again. `.references/srd-5.2.1/classes.md`,
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

**Rules basis / gap:** `.references/srd-5.2.1/spells.md`,
"Combining Spell Effects" says that effects of the same spell cast multiple
times do not combine, and that the most recent effect applies when the castings
are equally potent. `.references/srd-5.2.1/spells.md`,
"Enlarge/Reduce" defines the distinct Enlarge and Reduce creature projections
but does not specify how opposite-mode castings are compared or how their
active projections transition, so the target-exclusive replacement rule is an
explicit model choice for that gap.

## A50: Mixed-damage Frenzy is a Table Decision

**Assumption:** A Strength-based Stat Block attack with multiple damage types
still triggers Frenzy. When its authored base damage components contain more
than one distinct damage type, the table chooses the extra Frenzy dice's type
from exactly those distinct types. A single distinct type is automatic.

**Rules basis / gap:** `.references/srd-5.2.1/classes.md`, "Level 3:
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

**Rules basis / gap:** `.references/srd-5.2.1/spells.md`,
"Hypnotic Pattern" says that the effect ends for an affected creature if
someone else uses an Action to shake the creature out of its stupor. Unlike
`.references/srd-5.2.1/spells.md`, "Sleep," which explicitly
requires someone within 5 feet, Hypnotic Pattern specifies no distance or
general reachability procedure. Whether the acting creature can perform the
physical shake is therefore supplied by the Table without authoring a distance.

## A52: Command's Halt prevents Dropping Prone

**Assumption:** While Command's Halt applies on its turn, the target can't drop
Prone, even though its Speed isn't 0.

**Rules basis / gap:** `.references/srd-5.2.1/spells.md`, "Command," says that
under Halt the target "doesn't move and takes no action or Bonus Action."
`.references/srd-5.2.1/playing-the-game.md`, "Dropping Prone," lets a creature
give itself the Prone condition "without using an action or any of your Speed,
but you can't do so if your Speed is 0." Halt doesn't set Speed to 0, and the
SRD doesn't say whether lowering yourself to the ground counts as moving. The
model reads "doesn't move" as covering any voluntary change of the target's
position, so Halt suppresses Drop Prone as it suppresses Movement and Stand from
Prone.

## A54: Graze fixes outgoing damage; Vulnerability doubles damage taken

**Assumption:** Graze's restriction fixes the attacker's outgoing damage at the
attack ability modifier, with a minimum of 0. The target then applies Immunity,
Resistance, and Vulnerability normally. With a +3 attack ability modifier and
Vulnerability to the weapon's damage type, the target takes 6 Graze damage.
Damage bonuses, extra dice, and attack riders do not increase the outgoing
Graze amount.

**Rules basis / gap:** `.references/srd-5.2.1/equipment.md`, "Graze," permits
increasing its damage only by increasing the ability modifier.
`.references/srd-5.2.1/playing-the-game.md`, "Order of Application," applies
Vulnerability after other damage adjustments and Resistance. The SRD does not
explicitly settle whether Graze's restriction also prevents that target-side
adjustment. This model applies the restriction to outgoing damage and permits
Vulnerability to double the damage taken by the target.

## A55: Different reroll sources may apply sequentially to the same die

**Assumption:** A die rerolled by one source may be rerolled again by a
different source, provided each source's triggering conditions, timing,
resource costs, and usage limits are satisfied. "Must use the new roll"
prevents choosing the previous result; it does not prevent another eligible
source from replacing the new result. This does not grant additional uses of
the same source.

**Rules basis / gap:** `.references/srd-5.2.1/rules-glossary.md`,
"Heroic Inspiration," permits rerolling any die immediately after rolling it
and requires using the new roll. `.references/srd-5.2.1/character-origins.md`,
"Halfling," uses the same requirement for Luck. Neither passage explicitly
addresses a subsequent reroll by a different source. The model permits that
sequence rather than imposing a shared one-reroll limit across sources.
`.references/srd-5.2.1/playing-the-game.md`, "Interactions with Rerolls,"
still limits each reroll with Advantage or Disadvantage to one chosen die,
not both.

## A57: A thrown weapon is not held with two hands for its damage

**Assumption:** A thrown attack with a Two-Handed or Versatile Melee weapon
doesn't use the attack damage die floor that a Melee weapon held with two
hands grants, whatever grip the loadout records.

**Rules basis / gap:** `.references/srd-5.2.1/feats.md`, "Great Weapon
Fighting" applies "when you roll damage for an attack you make with a Melee
weapon that you are holding with two hands". `.references/srd-5.2.1/equipment.md`,
"Thrown" makes the throw a ranged attack, and "Versatile" grants its two-handed
damage only "to make a melee attack". The SRD doesn't say whether a thrown
weapon counts as held with two hands when its damage is rolled. The model reads
the throw as releasing the weapon, so it is no longer held then.

## A60: The free object interaction belongs to the creature's own turn

**Assumption:** Battle offers the free object interaction only on the
creature's own turn, while it can act (it isn't Incapacitated), and not while
Command's Halt applies. The first interaction each turn is free unless the
table rules that the object needs an action; any other takes the Utilize
action. The free interaction isn't tied to a moment of the move or the action:
the table says when it happens. Off its turn a creature has no free
interaction, not even during readied movement, but Ready can hold an object
interaction as its readied action. Releasing it takes that readied Utilize
action, whatever the table rules about the object. Any other off-turn
interaction is the table's ruling, outside Battle's costs. Battle also leaves
reach to the table: it offers the pickup of a fallen weapon wherever the weapon
lies, and the caller takes it only when the table rules the creature can reach
it.

**Rules basis / gap:** `.references/srd-5.2.1/playing-the-game.md`, "Your
Turn," lets a creature "interact with one object or feature of the environment
for free, during either your move or action," and requires the Utilize action
for a second object. `.references/srd-5.2.1/rules-glossary.md`, "Ready
[Action]," lets a creature choose "the action you will take in response to
that trigger, or ... to move up to your Speed," with the example "I'll pull
the lever that opens it." `.references/srd-5.2.1/rules-glossary.md`,
"Incapacitated," says "You can't take any action, Bonus Action, or Reaction,"
and `.references/srd-5.2.1/spells.md`, "Command," says that under Halt the
target "doesn't move and takes no action." The SRD doesn't say whether a
creature that can't act may still interact during its move, or whether a
Reaction, including readied movement, comes with a free interaction. The model
ties the free interaction to a turn the creature can act on, and lets a
readied interaction take only the action Ready held.

## A63: A weapon change after an attack comes before the next attack

**Assumption:** Each attack a character makes as part of its Attack action on
its own turn can equip or unequip one of the weapons it owns. The
change can come before the attack, carried on the attack itself, or after it.
A change after the attack must come before the character's next attack as part
of the Attack action. If that next attack carries its own change before its
roll, any change still left from the attack before it is gone. A Grapple or
Shove that takes the place of one of these attacks is such an attack too: it
can carry its own change before it, such as stowing a weapon to free the hand
a Grapple grabs with, or leave one after it, and it ends the window of the
attack before it. Other attacks, such as an off-hand attack with a Bonus
Action, or a Grapple or Shove with a Flurry of Blows Unarmed Strike, carry no
change and leave a change still left as it was. Preparing Ready grants no
change before its trigger, so the Grapple or Shove that Ready holds carries
none. Any change still left at the end of the turn is also gone.

Equipping draws a carried weapon, or picks up one lying on the ground, into
one hand slot of the character's loadout: the main hand or the off hand. The
slot's own weapon goes back with its loadout grip. Another weapon takes the
slot once the slot's weapon, if any, is out of hand; that weapon then leaves
the loadout, still carried or lying where it fell. In the main hand a
Two-Handed weapon takes a two-handed grip and any other weapon a one-handed
one, which A65's grip change can then change. The hands the slot gives the
weapon must be empty. Unequipping either sheathes or stows a
held weapon, which Battle treats the same, or drops it. A dropped weapon lands
where the table places it, and stays on the ground for its owner to pick up
again. As with A60, whether the creature can reach a fallen weapon is the
table's call.

**Rules basis / gap:** `.references/srd-5.2.1/rules-glossary.md`, "Attack
[Action]," Equipping and Unequipping Weapons, says "You can either equip or
unequip one weapon when you make an attack as part of this action. You do so
either before or after the attack." It also says "Equipping a weapon includes
drawing it from a sheath or picking it up. Unequipping a weapon includes
sheathing, stowing, or dropping it." "Unarmed Strike" calls an Unarmed Strike
"a melee attack" whose options include Grapple and Shove, and a Grapple is
"possible only if ... you have a hand free to grab it." The SRD doesn't say how
long after the attack the change may wait, or where a dropped weapon lands. The
change belongs to the Attack action, so the model ends the window at the
action's next attack, which keeps each change to one attack, and asks the table
where the weapon lands.

**Temporary implementation restriction (not a rules assumption):** Battle
brings into the battle only owned weapons it can execute; one it can't stays
out, as if left behind. The object interaction that picks a fallen weapon up puts back only a
loadout weapon, into its own slot. Battle's Attack action attacks with the
main weapon, and its off hand holds only the second weapon of the Light
property's Bonus Action attack, so another weapon goes in the off hand only
beside a main weapon in hand, and a Two-Handed weapon never goes there. The
slot's own weapon takes the hands its loadout grip gives it, so under a
two-handed main grip an off-hand weapon has none, even while the main weapon
is out of hand. The SRD sets none of these limits. Wild Shape's equipment
choice covers the loadout's objects only, so an owned weapon outside the
loadout stays carried whatever the druid chooses.

## A58: Any weapon may be held with both hands

**Assumption:** A loadout's main weapon has a grip. Any weapon may take the
`two_handed` grip, and a Two-Handed weapon needs it. A `two_handed` grip
occupies both hands, so the same loadout can't also hold a shield or an
off-hand weapon, and neither hand is free for a grapple or a held object. A
Versatile weapon deals its Versatile damage on a melee attack while it is held
with the `two_handed` grip.

**Rules basis / gap:** `.references/srd-5.2.1/equipment.md`, "Two-Handed"
says such a weapon "requires two hands when you attack with it", and
"Versatile" says the weapon "can be used with one or two hands" and deals its
Versatile damage "when used with two hands to make a melee attack". The SRD
says when two hands are required, not that any other weapon can't be held in
both.

The loadout's grip is the grip the weapon starts the battle with; A65 covers
changing it during the battle.

## A64: A stat block's ammunition attack needs no free hand

**Assumption:** Battle checks the free hand for loading only for a character's
Ammunition weapon. A stat block attack that spends ammunition is offered
whatever else the creature holds, as long as it carries the ammunition.

**Rules basis / gap:** `.references/srd-5.2.1/equipment.md`, "Ammunition,"
says drawing the ammunition is part of the attack and that "you need a free
hand to load a one-handed weapon." `.references/srd-5.2.1/monsters.md`,
"Ammunition and Ranged Attacks," says only that a monster carries the
ammunition it needs. A stat block lists its attacks, and sometimes its Gear,
such as the Spy's Hand Crossbow and Shortsword in
`.references/srd-5.2.1/monsters-A-Z.md`, but it never says what the creature
holds in each hand when it attacks. The SRD gives no fact to test the free
hand against, so Battle takes each stat block attack as usable as written.

## A65: A creature changes its weapon grip for free on its own turn

**Assumption:** During a battle, a character can change its held main weapon
between the `one_handed` and `two_handed` grips. The change costs no action,
Bonus Action, movement or object interaction. Battle offers it on the
creature's own turn while it can act (it isn't Incapacitated), including while
Command's Halt applies, since a change of grip is neither a move nor an action.
A `two_handed` grip needs the other hand free of any shield, off-hand weapon,
grapple or held object. A Two-Handed weapon keeps its `two_handed` grip (A58).
Changing grip off the creature's turn is the table's ruling, outside Battle.

**Rules basis / gap:** `.references/srd-5.2.1/equipment.md`, "Versatile," says
the weapon "can be used with one or two hands" and deals its Versatile damage
"when used with two hands to make a melee attack." The SRD never says what
changing between one and two hands costs or when it can happen. It isn't
equipping or unequipping a weapon (`.references/srd-5.2.1/rules-glossary.md`,
"Attack [Action]"), since the weapon stays in hand, and nothing in "Your Turn"
(`.references/srd-5.2.1/playing-the-game.md`) charges for it. Battle adds no
cost the SRD doesn't state, and keeps the change to the creature's own turn,
as it does the free object interaction (A60).

## A59: A Chromatic Orb leap measures cover from the previous target

**Assumption:** When the orb leaps, the new target's cover against the new
attack roll is measured from the creature the orb leaps from, not from the
caster. The table supplies that degree on the leap's geometry fact; a new target
with Total Cover from the previous target can't be leapt to.

**Rules basis / gap:** `.references/srd-5.2.1/spells.md`, "Chromatic Orb," says
the orb "leaps to a different target of your choice within 30 feet of the
target" and that you "make an attack roll against the new target," but not
where that attack originates. `.references/srd-5.2.1/playing-the-game.md`,
"Cover," says a target benefits from cover only "when an attack or other effect
originates on the opposite side of the cover." The model reads the leap as
travelling from the previous target, so the attack originates there.

## A61: A Prone Levitated creature can't move along a path

**Assumption:** A creature that is both Prone and the target of Levitate has no
movement along a path. It can still spend movement to right itself.

**Rules basis / gap:** `.references/srd-5.2.1/rules-glossary.md`, "Prone,"
says: "Your only movement options are to crawl or to spend an amount of
movement equal to half your Speed (round down) to right yourself."
`.references/srd-5.2.1/spells.md`, "Levitate," says the target "can move only
by pushing or pulling against a fixed object or surface within reach ..., which
allows it to move as if it were climbing." Each rule names the only movement
the creature has, and the SRD doesn't say how they combine. The model applies
both limits, and no movement is both crawling and climbing, so every path is
refused while righting itself stays available. The QNT owner is
`moveLevitatedTargetWithWitness` in `battle-runtime-levitate-creature.qnt`.

## A62: A Jump spends its fixed movement whatever its path crosses

**Assumption:** A creature that jumps with the Jump spell spends exactly 10
feet of movement, even when its path crosses Difficult Terrain, a spell's
Difficult Terrain, or a Gust of Wind Line it moves closer through. The areas'
other effects, such as damage for each distance moved, still apply.

**Rules basis / gap:** `.references/srd-5.2.1/spells.md`, "Jump," says the
creature "can jump up to 30 feet by spending 10 feet of movement," a fixed
spend rather than a cost per foot. `.references/srd-5.2.1/rules-glossary.md`,
"Long Jump," says only that landing in Difficult Terrain needs a DC 10
Dexterity (Acrobatics) check, so a jump doesn't pay Difficult Terrain's extra
foot for each foot it passes over. The SRD doesn't say whether a surcharge for
each foot moved, such as Gust of Wind's, changes the fixed spend. The model
treats every such surcharge alike and leaves the spend at 10 feet. The QNT
owner is `battle-runtime-jump-movement.qnt`, which admits only that spend.
