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

Transaction shapes:
- **1-to-1 attack**: attacker rolls, target may react, damage applied. (R20)
- **1-to-1 save**: caster's DC, target rolls save, effect on fail. (R31)
- **1-to-many AoE**: caster acts once, each target saves/takes damage independently. (R32)
- **1-to-1 heal**: healer spends resource, target gains HP. No interrupt points.
- **1-to-1 buff/debuff**: caster concentrates, target gains/loses effect. Creates a concentration link. (R33)
- **1-to-1 help**: helper spends action, ally gains advantage on next roll vs a target. (R34)

## Interrupts and Reactions

**Trigger** — A game event that allows one or more creatures to react. Triggers arise from actions, movement, damage, spellcasting, and other events. See `REQUIREMENTS.md` R10 for the full catalog.

**Interrupt Point** — A moment during resolution where the battle pauses to offer reaction opportunities. The SRD defines these implicitly through reaction trigger conditions. See `REQUIREMENTS.md` R20-R23.

**Reaction Stack** — When a reaction itself creates a trigger (e.g., Counterspell is a spell, so it can be Counterspelled), reactions nest. The stack resolves innermost-first. Depth bounded by number of creatures with unused reactions.

**Reaction Window** — At each interrupt point, the set of creatures eligible to react:
- Has reaction available (not yet used this round)
- Has a valid reaction for this trigger type
- Meets the reaction's specific conditions (range, visibility, etc.)

**Pass** — Historical term for a creature declining to react. Prefer **Decline** for per-creature windows.

## Resolve / Commit Doctrine

The repo separates pure outcome resolution from runtime state commitment across
two independent implementations:

- **Resolve layer**: focused battle-runtime QNT and shared rule-core QNT
  compute rule consequences over immutable battle records.
- **Commit layer**: battle-runtime reducers commit those same outcomes as
  runtime state transitions for actors, UI, and tooling.
- **Parity proof**: MBT replays Quint traces against the runtime commit layer
  and checks that it reproduces the resolve layer.

Within the interrupt-resolution pipeline, use this vocabulary:

- **resolve**: compute the outcome
- **offer**: open a reaction window
- **decline**: an eligible reactor chooses not to react
- **apply**: build the new state
- **advance**: move to the next phase boundary

## Timing Categories

Reactions have four distinct timing relationships to their triggers (derived from SRD text, see `REQUIREMENTS.md` R10):

**Retroactive** — Trigger says "hit" or "succeeds" but reaction changes the threshold, potentially turning a hit into a miss. Example: Shield adds +5 AC "including against the triggering attack."

**Before** — Reaction fires before trigger completes, potentially canceling it. Example: Counterspell stops a spell mid-cast. OA fires "right before" creature leaves reach.

**Damage Reduction** — Hit is confirmed, reaction modifies the damage amount before application. Example: Uncanny Dodge halves damage.

**After** — Trigger fully resolves, reaction is an independent response. Example: Hellish Rebuke deals damage back to the attacker.

## Resource Consumption Terms

The battle layer uses the shared support-language terms from `UBIQUITOUS_LANGUAGE.md` for action costs:

- **Quota** covers immediate turn-economy spends such as action, bonus action, reaction, and movement.
- **Pool** covers rest- or feature-recharged stocks such as spell slots, Rage uses, Bardic Inspiration uses, and Action Surge.
- **Lock** covers exclusive holds such as concentration.
- **Timer** covers ongoing countdowns such as Rage duration.

For battle action tokens, `ResourceCost` is limited to the immediate up-front costs a player chooses to pay now. Lock displacement and timer consequences remain outcome semantics, not selectable token costs. Examples:

- Readying a spell spends an action quota and a spell-slot pool now; the later reaction release is a separate quota spend.
- A Counterspell refund restores the spent spell-slot pool if the spell is negated, but it does not restore the per-turn slot-expended quota gate.

## Spatial Concepts

**Distance** — Always in feet (SRD). The battle layer does not define zones. Theatre of mind vs. grid is a caller concern — both produce feet.

**Reach** — The distance at which a creature can make melee attacks (5ft standard, 10ft for reach weapons). Also defines the boundary for opportunity attacks.

**Range** — The distances at which a ranged attack or spell can target: normal range (no penalty) and long range (disadvantage, see `AttackContext.beyondNormalRange`).

**Movement Step** — One engine-level movement segment. The current battle layer spends movement in 5-foot chunks and receives the caller-computed threatened set for that chunk, plus caller-owned provocation kind for whether that step can trigger opportunity attacks at all.

**Reach-Exit Checkpoint** — The exact movement boundary where a mover is still in a threat source's reach before the step and would be outside that reach after the step. Opportunity attacks are offered at this checkpoint, before the move completes.

**Threat Set** — The caller-provided set of creatures whose reach-exit checkpoints are crossed by the current movement step. The battle engine filters this set by reaction availability and incapacitation, but it does not compute geometry itself.

**Visibility Relation** — A caller-owned yes/no fact for whether one creature can currently see another. The battle layer consumes this for opportunity attacks and attack legality, but it does not derive line of sight from positions, cover, or obscuration.

**Help-Attack Proximity** — A caller-owned yes/no fact for whether the enemy distracted by the Help action is within 5 feet of the helper at the time of the action. The battle layer owns the action spend and resulting help link, not the geometry check.

**Threatened** — A creature is threatened by an enemy if within that enemy's reach and the enemy can see them. Leaving a threatened area triggers an opportunity attack.

## State Dependencies

**Aura** — A persistent effect centered on a creature that affects other creatures within a radius. Example: Paladin Aura of Protection (10ft/30ft). The aura's benefit depends on the source creature's state (alive, conscious, not incapacitated).

**Link** — A persistent connection between two creatures' states. Breaking the link (incapacitation, distance, death) affects both sides. Links are the mechanism for concentration break propagation.

Link types:
- **Concentration link**: caster concentrates on spell → target(s) have effect. Caster's concentration breaks → effects end on all targets. One-to-many.
- **Grapple link**: grappler and target. Grappler's speed halved, target's speed 0. Ends if either is incapacitated or moved out of reach. One-to-one, bidirectional.
- **Help link**: helper → beneficiary. Expires on beneficiary's next relevant roll. One-to-one, ephemeral.
- **Mount link**: rider and mount share initiative. Mount death → rider falls. Controlled mount: rider directs movement. One-to-one, bidirectional.

**Concentration Break Propagation** — When a creature's concentration breaks (from damage, incapacitation, death, or casting another concentration spell), the concentrated spell's effects end on ALL affected creatures. Example: caster takes damage → fails CON save → concentration breaks → spell effect ends → conditions imposed by that spell are removed from all targets. In rare edge cases this can chain (creature A's concentration break removes a buff from B, causing B to drop to 0 HP, breaking B's own concentration), but the common case is a single propagation from concentrator to affected creatures.
