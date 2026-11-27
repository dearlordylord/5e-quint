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

A readied Attack is the Attack action taken with a Reaction when its trigger
occurs, so its one attack gets the one change too, on another creature's turn.
The reactor chooses it when releasing the readied attack: a change before the
attack, after which the readied attack must still be there, or a change after
it. A change after the attack is chosen before the roll, against the hands as
the attack will leave them. Battle makes it once the readied attack is over,
after any Reaction to its hit or damage, and only if the reactor can still
take actions, the required hand is free, and the weapon is still where the
change needs it. A Grapple that grabs with that hand can therefore prevent a
preselected equip after it; a resisted Grapple leaves that hand free. Where a weapon
dropped after the attack lands is asked when the attack is released. Preparing Ready grants no change, and no other Reaction attack, such
as an Opportunity Attack, carries one.

Equipping draws a carried weapon, or picks up one lying on the ground, into
one hand slot of the character's loadout: the main hand or the off hand. The
slot's own weapon prefers its loadout grip, using one hand if the other hand is occupied. Another weapon takes the
slot once the slot's weapon, if any, is out of hand; that weapon then leaves
the loadout, still carried or lying where it fell. In the main hand a
Two-Handed weapon takes a two-handed grip when both hands are free, otherwise
it is held in one hand. Any other weapon takes a one-handed grip. A65's grip
change can then change this holding grip; attacking with a Two-Handed weapon
still requires two hands. The hands the slot gives the
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
"possible only if ... you have a hand free to grab it." "Ready [Action]" lets
the creature choose "the action you will take in response to that trigger" and
"take your Reaction right after the trigger finishes"; an Opportunity Attack is
"one melee attack" with the Reaction, not the Attack action. The SRD doesn't say
how long after the attack the change may wait, when a readied attack's change
after it is chosen, or where a dropped weapon lands. The change belongs to the
Attack action, so the model ends the window at the action's next attack, which
keeps each change to one attack, and asks the table where the weapon lands. A
readied attack's Reaction ends with the attack, so its change after the attack
is chosen with the release.

**Temporary implementation restriction (not a rules assumption):** Battle
brings into the battle only owned weapons it can execute; one it can't stays
out, as if left behind. The object interaction that picks a fallen weapon up
puts back only a loadout weapon, into its own slot. The supported weapon-slot
restrictions are owned by
[Battle's implementation boundaries](packages/battle-runtime/README.md#weapon-slot-implementation-restrictions).
A change after a readied throw can't name the thrown weapon, which rests
wherever it lands. Wild Shape's equipment choice also includes carried spare
owned weapons; weapons already on the ground remain there.

## A58: Any weapon may be held with both hands

**Assumption:** A loadout's main weapon has a grip. Any weapon may take the
`two_handed` grip. A Two-Handed weapon needs that grip when attacking with it,
but may be held with the `one_handed` grip. A `two_handed` grip
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
grapple or held object. A Two-Handed weapon may be held in one hand; attacking
with it requires its `two_handed` grip (A58).
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

## A66: Cover adds after an AC floor

**Assumption:** A floor on a creature's AC, such as Barkskin's, applies to the
creature's own AC: its base calculation with its bonuses and penalties. The
bonus of the cover a target has against an attack adds after that floor.

**Rules basis / gap:** `.references/srd-5.2.1/spells.md`, "Barkskin": "the
target has an Armor Class of 17 if its AC is lower than that." `.references/srd-5.2.1/rules-glossary.md`,
"Cover": Half Cover gives a "+2 bonus to AC" and Three-Quarters Cover a "+5
bonus to AC". The SRD doesn't say whether the floor compares the creature's AC
with or without the cover of one attack. Cover belongs to the attack's
geometry, not the creature, so the model adds it to the creature's AC after
the floor: a Barkskin creature with AC 12 behind Half Cover has AC 19 against
that attack.

## A67: A d20 minimum applies to the d20 that stands

**Assumption:** A feature that lets a creature treat a low d20 as a higher
face, such as Reliable Talent, applies to whichever d20 stands once every
reroll is done: the original roll, the d20 Advantage or Disadvantage selects,
or a reroll's new d20. The creature decides once whether to use it on the
roll, and the decision holds for the d20 that stands. A reroll's total keeps
the modifiers of a total that counted the minimum.

**Rules basis / gap:** `.references/srd-5.2.1/classes.md`, "Reliable Talent":
"Whenever you make an ability check that uses one of your skill or tool
proficiencies, you can treat a d20 roll of 9 or lower as a 10."
`.references/srd-5.2.1/playing-the-game.md`, "D20 Tests," adds modifiers to
the d20 before comparing the total, and "Interactions with Rerolls" and A55
let a reroll replace the d20. The SRD doesn't say whether the minimum applies
before or after a reroll. A rerolled d20 is still the d20 roll of the check,
so the model applies the minimum to the d20 that stands. The QNT owner is
`unit-feature-d20-test-die-minimum-core.qnt`.

## A68: Dice added to a failed D20 Test come after its rerolls

**Assumption:** A D20 Test's rerolls are decided before any die is added to
it. Once every reroll source has decided, a source that adds a die to a failed
test may add it to the roll that stands, in the order the roller chooses,
while the test still fails. Every added die counts before the test is judged,
so a cost that depends on the result (Tactical Mind's use of Second Wind)
follows the result with all the dice added.

**Rules basis / gap:** `.references/srd-5.2.1/classes.md`, "Bardic
Inspiration": "when the creature fails a D20 Test, the creature can roll the
Bardic Inspiration die and add the number rolled to the d20". "Tactical Mind":
"When you fail an ability check, you can expend a use of your Second Wind ...
roll 1d10 and add the number rolled to the ability check ... If the check
still fails, this use of Second Wind isn't expended." Both answer a failure,
and a reroll replaces the d20 that an added die would add to, so the SRD
doesn't say what an added die does to a later reroll. The model takes the
rerolls first. The SRD also doesn't say whether Tactical Mind's "still fails"
reads the check before or after another added die; the model judges the check
once with every added die.

## A70: Damage that Temporary Hit Points absorb at 0 Hit Points

**Assumption:** A creature at 0 Hit Points that takes damage suffers the Death
Saving Throw failure (two for a Critical Hit) even when its Temporary Hit
Points absorb all of that damage, and it dies if the whole damage equals or
exceeds its Hit Point maximum. The Temporary Hit Points still go first. A
Stable creature in that case stops being Stable.

**Rules basis / gap:** `.references/srd-5.2.1/playing-the-game.md`, "Damage
at 0 Hit Points": "If you take any damage while you have 0 Hit Points, you
suffer a Death Saving Throw failure ... If the damage equals or exceeds your
Hit Point maximum, you die." "Lose Temporary Hit Points First": "If you have
Temporary Hit Points and take damage, those points are lost first", with the
example "if you have 5 Temporary Hit Points and take 7 damage". So damage that
Temporary Hit Points absorb is still damage taken. "Massive Damage" tests the
damage that remains, but only when damage reduces a creature to 0; the at-0
rule tests "the damage". The SRD doesn't state this interaction outright, so
the model reads the at-0 rule as written. The QNT owner is
`zero-hit-point-lifecycle.qnt:applyDamageToZeroHitPointCreature`.
