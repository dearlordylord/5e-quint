# Battle State — Domain Language

Terms and definitions for the multi-creature battle layer. Extends `UBIQUITOUS_LANGUAGE.md` (single-creature terms).

---

## Creatures and Identity

**Creature** — Any participant in combat: PC, NPC, or monster. Each has a `CreatureState` (the existing `DndContext`).

**CreatureId** — Unique identifier for a creature within a battle. Stable across rounds.

**Active Creature** — The creature whose turn it is. Only the active creature can take actions, bonus actions, and movement voluntarily. Other creatures may only act via reactions or legendary actions.

## Battle Structure

**Battle** — A combat encounter. Contains a set of creatures, their states, and the initiative order.

**Round** — One full pass through the initiative order. Every creature gets exactly one turn per round.

**Turn** — One creature's opportunity to act (move, action, bonus action, free interaction). Corresponds to the existing single-creature state machine's START_TURN → actions → END_TURN cycle.

**Initiative Order** — The sequence in which creatures take turns. Determined once at combat start (DEX check). Ties broken by DM.

## Transactions

**Transaction** — A cross-creature event where one creature's action affects another creature's state. The atomic unit of multi-creature interaction.

Examples:
- Attack: attacker spends action/extra attack, target takes damage
- Heal: healer expends slot, target gains HP
- Buff: caster expends slot + starts concentration, target gains effect
- Grapple: attacker spends attack, target gains grappled condition (linked to attacker)

A transaction may touch 1 creature (self-buff), 2 creatures (attack), or N creatures (Fireball, aura).

## Interrupts and Reactions

**Trigger** — A game event that allows one or more creatures to react. Triggers arise from actions, movement, damage, spellcasting, and other events. See `REQUIREMENTS.md` R10 for the full catalog.

**Interrupt Point** — A moment during resolution where the battle pauses to offer reaction opportunities. The SRD defines these implicitly through reaction trigger conditions. See `REQUIREMENTS.md` R20-R23.

**Reaction Stack** — When a reaction itself creates a trigger (e.g., Counterspell is a spell, so it can be Counterspelled), reactions nest. The stack resolves innermost-first. Depth bounded by number of creatures with unused reactions.

**Reaction Window** — At each interrupt point, the set of creatures eligible to react:
- Has reaction available (not yet used this round)
- Has a valid reaction for this trigger type
- Meets the reaction's specific conditions (range, visibility, etc.)

**Pass** — A creature in a reaction window decides not to react. Explicitly declining does not consume the reaction.

## Timing Categories

Reactions have four distinct timing relationships to their triggers (derived from SRD text, see `REQUIREMENTS.md` R10):

**Retroactive** — Trigger says "hit" or "succeeds" but reaction changes the threshold, potentially turning a hit into a miss. Example: Shield adds +5 AC "including against the triggering attack."

**Before** — Reaction fires before trigger completes, potentially canceling it. Example: Counterspell stops a spell mid-cast. OA fires "right before" creature leaves reach.

**Damage Reduction** — Hit is confirmed, reaction modifies the damage amount before application. Example: Uncanny Dodge halves damage.

**After** — Trigger fully resolves, reaction is an independent response. Example: Hellish Rebuke deals damage back to the attacker.

## Spatial Concepts

**Distance** — Always in feet (SRD). The battle layer does not define zones. Theatre of mind vs. grid is a caller concern — both produce feet.

**Reach** — The distance at which a creature can make melee attacks (5ft standard, 10ft for reach weapons). Also defines the boundary for opportunity attacks.

**Range** — The distances at which a ranged attack or spell can target: normal range (no penalty) and long range (disadvantage, see `AttackContext.beyondNormalRange`).

**Threatened** — A creature is threatened by an enemy if within that enemy's reach and the enemy can see them. Leaving a threatened area triggers an opportunity attack.

## State Dependencies

**Aura** — A persistent effect centered on a creature that affects other creatures within a radius. Example: Paladin Aura of Protection (10ft/30ft). The aura's benefit depends on the source creature's state (alive, conscious, not incapacitated).

**Link** — A persistent connection between two creatures' states. Example: grapple (grappler + target), concentration (caster + affected targets). Breaking the link (incapacitation, distance, death) affects both sides.

**Concentration Break Propagation** — When a creature's concentration breaks (from damage, incapacitation, death, or casting another concentration spell), the concentrated spell's effects end on ALL affected creatures. Example: caster takes damage → fails CON save → concentration breaks → spell effect ends → conditions imposed by that spell are removed from all targets. In rare edge cases this can chain (creature A's concentration break removes a buff from B, causing B to drop to 0 HP, breaking B's own concentration), but the common case is a single propagation from concentrator to affected creatures.
