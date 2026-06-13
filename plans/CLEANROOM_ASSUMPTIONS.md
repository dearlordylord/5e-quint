# Cleanroom Assumptions

Curated subset of the source project's modeling assumptions. Each entry is a
RAW-ambiguity decision or domain-semantics choice that the copied QNT corpus
relies on. Entry numbers (A1, A2, ...) are stable citation ids; gaps in the
numbering are intentional. Implementation-change records were stripped: only
the assumption and its rules basis are cleanroom inputs.

When RAW and QNT disagree or leave an executable rule ambiguous and no entry
here covers it, record the issue in `tasks/BLOCKERS.md`. Do not invent an
interpretation and do not import assumptions from outside `cleanroom-input/`.

## A1: Spell slot expenditure and starting concentration require ability to act

**Assumption:** EXPEND_SLOT, EXPEND_PACT_SLOT, and START_CONCENTRATION are only valid when the creature is alive (hp > 0, not dead) and not incapacitated.

**Rules basis (SRD 5.2.1 Rules-Glossary "Incapacitated [Condition]"):** Casting a spell requires an Action or Bonus Action, and starting concentration is a consequence of casting a concentration spell. "An Incapacitated creature can't take any action, Bonus Action, or Reaction." Multiple conditions impose Incapacitated: Unconscious (from dropping to 0 HP), Paralyzed, Petrified, Stunned, and direct Incapacitated. Any of these blocks slot expenditure and starting new concentration. The SRD never states "you cannot spend a spell slot while unable to act" verbatim — it is a constraint that follows logically from the casting rules.

## A2: END_TURN as modeling convention

**Assumption:** END_TURN is an explicit event in the state machine that transitions a creature from `acting` to `waitingForTurn`.

**Rules basis (PHB Ch. 9):** D&D 5e has no explicit "end turn" action. Turns proceed through initiative order implicitly. However, "at the end of your turn" is a pervasive trigger point in the rules (repeated saves for condition spells, ongoing damage, effect expiry). At the table, players universally say "I end my turn." The state machine needs a discrete transition to prevent START_TURN spam and to process end-of-turn triggers.

## A4: Round = 6 seconds as the atomic time unit

**Assumption:** The round (6 seconds) is the smallest time unit modeled. All durations are tracked as integer turn counts; no sub-round time tracking exists. When authored time-span durations are projected into elapsed-time math, each round contributes exactly 6 seconds — the conversion never prorates or subtracts partial round progress based on whose turn is currently being resolved.

**Rules basis (SRD 5.2.1 Playing-the-Game):** A round represents about 6 seconds in the game world. Reactions, opportunity attacks, and reaction spells are interrupt-style triggers within the round framework, not smaller time quanta. No spell or ability uses a duration shorter than 1 round, and the SRD does not define partial-round elapsed-time accounting.

**Rationale:** Initiative order is a resolution view over combat time, not a statement that one creature's turn consumes an isolated slice of the 6-second round. The model treats the turns in a round as an ordered resolution of one 6-second combat cycle, so it does not charge partial elapsed seconds based on position in initiative order.

## A5: Single-creature turn = 1 round for duration tracking

**Assumption:** In the single-creature model, each START_TURN/END_TURN cycle represents one round passing. Effect duration counters decrement by 1 per cycle regardless of when the effect was applied relative to initiative order.

**Rules basis:** This is a simplification. In multi-creature combat, a round is one full pass through the initiative order. An effect cast mid-round by another creature would technically expire at that creature's turn N rounds later, not at our turn. In a single-creature model we only observe our own turns, so each turn = 1 round is the only tractable approach. The caller is responsible for providing correct initial duration values accounting for initiative-order offset if needed.

## A6: Death save precedes start-of-turn effect processing

> **TODO: RAW violation.** The SRD 5.2.1 Simultaneous Effects rule (Rules-Glossary) explicitly states: "If two or more things happen at the same time on a turn, the person at the game table — player or GM — whose turn it is decides the order in which those things happen." This means the player should be able to choose whether the death save or start-of-turn effects resolve first. The current fixed ordering violates RAW. Fix: model this as a caller-provided input (the player's choice of ordering), not a hardcoded sequence.

**Assumption:** At the start of a turn, the death save (if applicable) resolves before any start-of-turn spell effects (heals, damage, temp HP, saves).

**Rules basis (SRD 5.2.1 Rules-Glossary "Death Saving Throw"):** "Whenever you start your turn with 0 Hit Points, you must make a Death Saving Throw." This is a mandatory, first-order rule. Start-of-turn spell effects (e.g., Regenerate's heal, Searing Smite's burn) trigger "at the start of your turn" at the same timing point but are optional/conditional. The death save resolves first because: (a) it is mandatory, (b) a natural 20 changes the creature's conscious state (hp 0→1), which affects subsequent processing, (c) death from 3 failures makes subsequent effects irrelevant.

## A8: Two-Weapon Fighting requires melee weapons

**Assumption:** `pCanTWFWithWeapons` requires both weapons to have the Light property AND be melee weapons.

**Rules basis (Equipment.md "Light [Weapon Property]"):** SRD 5.2.1 says "when you take the Attack action on your turn and attack with a Light weapon, you can make one extra attack as a Bonus Action later on the same turn with a different Light weapon." The 5.2.1 text is silent on whether the weapons must be melee. SRD 5.1 explicitly required "light melee weapon." We retain the melee-only requirement because: (a) all Light weapons in the SRD equipment tables are melee weapons (Hand Crossbow is Light but one-handed, and TWF requires a weapon "in the other hand"), (b) removing the constraint would allow dual-wielding hand crossbows RAW, which contradicts the Ammunition property's "one hand free to load" requirement, and (c) the constraint is strictly more conservative than the SRD text.

## A9: Multiclass Channel Divinity — additive per-class pools

**Assumption:** `pChannelDivinityMax(config)` sums `pClericChannelDivinityMax` and `pPaladinChannelDivinityMax` independently based on each class's level. A Cleric 6 / Paladin 3 would have max 3 + 2 = 5 uses, drawn from a single shared charges counter.

**Rules basis:** SRD 5.2.1 Cleric (L2) and Paladin (L3) both say "this class's Channel Divinity," implying per-class tracking. However, the SRD 5.2.1 does not include explicit multiclass rules for Channel Divinity. The 5.1 PHB multiclass rules stated that gaining Channel Divinity from a second class does not grant additional uses — only additional effect options. We model additive pools as a permissive interpretation of 5.2.1's per-class language, which diverges from 5.1 intent (5.1 said no extra uses). This assumption can be revised if official 5.2.1 multiclass guidance clarifies.

## A16: Dead creatures: effect processing continues, heal/damage/exhaustion table mutations are no-ops

**Assumption:** When a creature dies mid-turn (e.g., from a death save during START_TURN), remaining start-of-turn and end-of-turn effects continue processing. Saves still remove effects. Temp HP grants still apply (temp HP is not HP). Healing and damage are no-ops on dead creatures. Generic post-death condition application/removal is also a no-op unless a source-owned revival/effect rule explicitly changes the condition; conditions that existed at death persist while their durations are ongoing. Generic post-death exhaustion addition/reduction is also a no-op; the only RAW mechanism for changing exhaustion on a dead creature is revival ("returns with 1 fewer level"), which is a source-owned revival mechanic, not a general table event. Exhaustion levels that existed at death persist.

**Rules basis (SRD 5.2.1 Rules Glossary "Dead"):** "A dead creature has no Hit Points and can't regain them." The same entry says that, unless otherwise stated, a revived creature returns with ongoing conditions, magical contagions, or curses that affected it at death. "If the creature died with any Exhaustion levels, it returns with 1 fewer level." The SRD does not define whether ongoing effects continue to tick on a dead creature's turn — dead creatures don't take turns in practice. This assumption makes the modeling choice explicit: the effect loop runs to completion (matching a fold over all effects), but operations that the SRD implicitly blocks (healing, damage) or leaves to source-owned revival/effect rules (post-death condition/exhaustion mutation) are skipped.

## A17: Standing from prone requires nonzero movement cost

**Assumption:** Standing from prone requires spending movement equal to half your speed (round down). If this cost rounds to 0 (e.g., speed 1 → floor(1/2) = 0), the creature cannot stand — the attempt is a no-op. This is stricter than a literal reading of RAW, which only gates on "Speed is 0."

**Rules basis (SRD 5.2.1 Rules Glossary "Prone"):** "spend an amount of movement equal to half your Speed (round down) to right yourself … If your Speed is 0, you can't right yourself." RAW explicitly blocks speed 0. For speed 1 (cost = 0), the SRD is silent. The spec interprets "spend movement" as requiring a nonzero expenditure — you cannot stand for free. This matches Quint's structural equality check: if no movement is spent, the turn state is unchanged, so prone persists.

## A19: Legendary Action timing in single-creature model

**Assumption:** Legendary Actions fire during `turnPhase == "waitingForTurn"`. In the SRD, a Legendary Action is taken "immediately after another creature's turn." Since the spec models a single creature, `waitingForTurn` represents the window between the creature's own turns — this is when other creatures would act.

**Rules basis (SRD 5.2.1 Monsters > Legendary Actions):** "A Legendary Action is an action that a monster can take immediately after another creature's turn." The spec's single-creature model cannot represent interleaved turns. Using `waitingForTurn` as the proxy is the closest structural equivalent.

## A22: Recharge abilities refresh on a rest

**Assumption:** Recharge abilities refresh on both a Short Rest and a Long Rest. (Legendary Action refresh at the start of the monster's turn, and Legendary Resistance / daily-ability refresh on a Long Rest, are stated by RAW and need no assumption — only the rest behavior of Recharge abilities is underspecified.)

**Rules basis (SRD 5.2.1 Monsters):** A "Recharge X–Y" ability rolls 1d6 at the start of each of the monster's turns to recharge, but the SRD gives no explicit rule for whether it also recharges on a rest. The spec assumes it does, since an encounter begun after a rest conventionally starts with Recharge abilities available.

## A26 Stable recovery timers do not cross the battle handoff boundary

**Assumption:** Character Battle handoff may preserve a fresh Stable zero-HP lifecycle, but it rejects an in-progress Stable recovery timer. Calendar-time progress toward the "regains 1 Hit Point after 1d4 hours" outcome remains Character Sheet state and must not be projected into or back out of battle handoff.

**Rules basis (SRD 5.2.1 Rules Glossary "Stable"):** The SRD defines Stable as a creature with 0 Hit Points that isn't required to make Death Saving Throws, and says the creature regains 1 Hit Point after `1d4` hours if it isn't healed first. The SRD does not define a combat-time procedure for partially elapsed out-of-combat Stable recovery while entering or exiting a battle boundary. Representing elapsed recovery time during handoff is therefore an architectural modeling choice rather than a direct RAW rule.

## A27 Active Wild Shape does not cross the character-sheet handoff boundary

**Assumption:** Character Battle handoff rejects a combatant that is still in an active Wild Shape form. The caller must dismiss the form or resolve reversion before projecting durable Character Sheet state.

**Rules basis (SRD 5.2.1 Druid Level 2 "Wild Shape"):** The SRD defines how long a Wild Shape form lasts and says the druid can leave the form early as a Bonus Action, or that the form ends when Wild Shape is used again, the druid has the Incapacitated condition, or dies. The SRD does not define a cross-boundary persistence protocol for writing durable Character Sheet state while the battle projection is still in Beast form. Blocking handoff until reversion is therefore an architectural boundary choice rather than a direct RAW handoff rule.

## A32: Trigger taxonomy — inferred from reaction catalog (battle layer)

**Assumption:** The SRD does not define a closed set of "trigger types." Each reaction specifies its trigger in natural language (e.g., "when you are hit by an attack roll"). The battle layer infers 11 trigger categories by grouping reactions that fire at the same game moment. This taxonomy is a modeling decision — the SRD does not name or enumerate these categories.

**Rules basis:** Every reaction trigger phrase in SRD 5.2.1 maps to exactly one of: ATTACK_HITS, ATTACK_DAMAGES, DAMAGE_TAKEN, SPELL_BEING_CAST, LEAVES_REACH, FALLS, SAVE_FAILED, TURN_STARTS, TURN_ENDS, MOVE_ENDS, ALLY_TAKES_ATTACK_ACTION.

**Why this matters:** The battle machine needs a finite set of interrupt points to check for eligible reactions. Without this taxonomy, the machine would need to pattern-match on natural language trigger descriptions. The taxonomy collapses 26+ reaction trigger phrases into 11 categories with identical game-moment semantics.

## A33: Mid-combat creature roster changes — DM discretion

**Assumption:** Creatures can enter and leave combat at any time. Reinforcements arrive, creatures flee, summons appear. The SRD does not prescribe rules for when or how this happens — it is DM discretion. The battle spec models a mutable creature set (insert/remove operations on the creature map).

**Initiative for new arrivals:** The SRD does not specify how a creature joining mid-combat enters the initiative order. The spec treats this as caller-provided: the caller supplies the initiative count when inserting a new creature.

**Dead/unconscious creatures in initiative:** The SRD does not explicitly remove dead or unconscious creatures from initiative order. Dead monsters are implicitly removed (they cease to exist). Unconscious PCs remain in initiative but are Incapacitated (can't act, speed 0). The spec keeps dead/unconscious creatures in the initiative list until explicitly removed by the caller. `EXIT_COMBAT` remains available after death as the caller-owned teardown mechanism; blocking it would strand a dead creature in initiative under A33.

**Summoned creature initiative:** Varies by spell. Find Familiar: rolls own initiative. Find Steed / Summon Dragon: shares caster's initiative count, acts on caster's turn or immediately after. Conjure spells (Animals, Elemental, etc.): no independent turn — act as effects under caster control.

**Rules basis:** Playing-the-Game.md states "Everyone involved in the combat encounter rolls Initiative" at start, and "The Initiative order remains the same from round to round." No rules for mid-combat changes. Combat ends "when one side or the other is defeated, which can mean the creatures are killed or knocked out or have surrendered or fled" — but no explicit removal from initiative on individual death/flee.

## A37: Grapple Movable cost modeled as movement cost, not speed reduction

**Assumption:** The SRD 5.2.1 Grappled condition's Movable property is modeled directly in battle semantics as an extra movement cost: when the grappler moves while dragging a grappled creature, each foot costs 1 extra foot unless the target is Tiny or two or more sizes smaller than the grappler.

**Rules basis:** Rules-Glossary "Grappled [Condition]" says: "The grappler can drag or carry you when it moves, but every foot of movement costs it 1 extra foot unless you are Tiny or two or more sizes smaller than it." This is a movement-cost rule, not a Speed reduction on the grappler. The grappled target still has Speed 0 until the grapple ends.

**Rationale:** The previous speed-halving representation diverged from RAW once grapple state changed mid-turn because recomputing `effectiveSpeed` could incorrectly rebuild `movementRemaining` for the grappler after link/release/escape. The current model keeps the grappler's Speed unchanged and applies the extra cost only when movement is actually spent while dragging. That preserves RAW behavior for mid-turn grapple changes and avoids fake movement refunds.

## A43: Scalar reductions on mixed damage rolls allocate proportionally

**Assumption:** When a single scalar reduction applies to an attack damage roll containing multiple damage types, the runtime allocates that reduction across the pre-adjustment damage entries proportionally to their amounts. Remainders use largest-remainder allocation, with ties resolved by authored entry order, and the total allocated reduction always equals the scalar reduction capped at total damage.

**Rules basis:** SRD 5.2.1 describes damage rolls, damage types, and applying Resistance/Vulnerability/Immunity after other damage modifiers, but it does not specify how to split one scalar reduction across a mixed-type damage roll before target adjustments.

**Rationale:** The promoted runtime stores typed damage entries so target adjustments can be applied after modifiers. Proportional allocation preserves the scalar total while keeping each typed entry nonnegative and deterministic.

## A44: Stat Block Multiattack dispatches are a named-attack continuation

**Assumption:** Once a monster takes Stat Block Multiattack, the granted named dispatch attacks are a continuation of that Attack action. Until those dispatch resources are spent or the monster ends its turn, ordinary turn options other than Movement between attacks are unavailable: standing from Prone, other standard actions, Bonus Actions, non-Movement runtime commands, spells, feature activations, and unrelated reactions/Legendary Action subjects are not discoverable or replayable as the current turn surface.

**Rules basis:** SRD 5.2.1 Monsters > Overview, "Multiattack" says the listed attacks and additional abilities are made as part of the monster's Attack action. Rules Glossary "Attack [Action]" allows movement between attacks for a feature that gives more than one attack as part of the Attack action, so Movement remains available while pending dispatch attacks are open. Playing the Game "Bonus Actions" says a creature chooses when to take a Bonus Action unless the Bonus Action's timing is specified. This runtime chooses a named-attack continuation model for Stat Block Multiattack dispatch replay so the fixed named dispatch list cannot be interleaved with unrelated non-Movement battle commands unless a future task models another specific RAW-permitted interleave point.

## A45: Reaction interrupt continuations use a bounded active window

**Assumption:** The rule-core reaction protocol models at most one active reaction window plus its suspended continuation at a time. If a reaction creates another reaction window before the original interrupted procedure advances, the replacement window carries the suspended outer window kind. The model bounds that active-plus-suspended depth to two for proof tractability; a third nested offer leaves the current window unchanged. Declining a window closes the active window without spending the Reaction quota and restores the suspended window if one exists. Taking a matching Reaction spends the reactor's Reaction quota and then advances back to the suspended continuation.

**Rules basis:** SRD 5.2.1 says a Reaction is an instant response to a trigger, a creature cannot take another Reaction until the start of its next turn, a Reaction normally occurs immediately after its trigger, and an interrupted creature continues its turn right after the Reaction. Ready says the reacting creature can take its Reaction after the trigger finishes or ignore the trigger. The SRD does not specify a general-purpose queue, stack, or replay policy for multiple nested reaction windows.

## A46: An owner's Long Rest leaves a surviving retained companion's Hit Points and Temporary Hit Points unchanged

**Assumption:** When a character who has a retained one-at-a-time companion (a Find Familiar-like familiar) finishes a Long Rest, a companion that survives the rest is left exactly as it was — its current Hit Points and Temporary Hit Points both persist, with no healing and no Temporary Hit Point expiry. The only companion the owner's Long Rest removes is a Wild Companion-protocol familiar, which disappears when its owner finishes the rest. A companion that had already disappeared at 0 Hit Points stays disappeared.

**Rules basis:** SRD 5.2.1 Temporary Hit Points last until lost or until the creature that has them finishes a Long Rest, and finishing a Long Rest restores the resting creature's own Hit Points; both effects are tied to the creature that finishes the rest. The SRD does not model whether a familiar participates in its owner's Long Rest. With companion rest participation unmodeled, the smallest deviation from RAW silence is to leave the companion untouched by the owner's rest rather than partially apply rest effects (the prior implementation cleared the companion's Temporary Hit Points without restoring its Hit Points, which matched neither a no-participation nor a shared-rest reading). SRD 5.2.1 Druid Wild Companion states the familiar created in that way disappears when the Druid finishes a Long Rest.

## A47: Recasting a retained companion continues its identity and clamps carried Hit Points to the new form

**Assumption:** When a character recasts a Find Familiar-like spell while it already has a retained one-at-a-time companion, the existing durable companion continues — the recast updates that companion in place and cannot replace its durable identity (the out-of-battle creation operation rejects a companion id that differs from the occupied slot's). The companion adopts the newly selected form; its current Hit Points carry over clamped to the new form's maximum and its Temporary Hit Points are kept. The one exception is a companion that had disappeared at 0 Hit Points: recasting re-forms it with the new form's full Hit Points and no Temporary Hit Points. The companion's protocol follows the casting route used for the recast, so recasting a Wild Companion familiar through an ordinary route yields the ordinary protocol. Creating a companion into an empty slot mints the new form's Hit Points. This is one recast semantic across layers: the in-battle form-adoption path already preserved-and-clamped Hit Points.

**Rules basis:** SRD 5.2.1 Find Familiar: "If you cast this spell while you already have a familiar, you cause it to adopt a new form" — one familiar at a time, recast adopts a new form rather than creating a second; and "When the familiar drops to 0 Hit Points, it disappears ... It reappears after you cast this spell again." The SRD does not state whether carried Hit Points transfer to an adopted form, what Hit Points the reappearing familiar has, or whether a casting-specific rider (e.g., Druid Wild Companion's Long Rest disappearance) persists across an ordinary recast. Preserve-and-clamp matches the in-battle form-adoption implementation and avoids both free healing and over-maximum Hit Points; fresh Hit Points on reappearance after 0 HP matches "it reappears" re-forming the familiar; protocol-follows-route keeps the single familiar's behavior tied to how it was most recently cast.
