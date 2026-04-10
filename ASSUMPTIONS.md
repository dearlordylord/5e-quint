# Modeling Assumptions

The spec (`creature.qnt`) maintains direct feature parity with the SRD. Formalizing prose rules into a state machine sometimes requires making explicit what the SRD leaves implicit — adding events the rules assume (END_TURN), connecting constraints that follow logically but aren't stated verbatim (slot expenditure requires ability to act), or choosing a formalization where the architecture demands one (single-creature time tracking). These modeling decisions are documented here. They are curated by the project owner, kept minimal, and stay close to RAW.

Each entry records the assumption, rules justification, and what changed in both Quint and XState.

## A1: Spell slot expenditure requires ability to act

**Assumption:** EXPEND_SLOT and EXPEND_PACT_SLOT are only valid when alive (hp > 0, not dead) AND not incapacitated.

**Rules basis (PHB Ch. 10, Ch. 12):** Casting a spell requires an action or bonus action. The Incapacitated condition (PHB Ch. 12) prevents taking actions or reactions. Multiple conditions impose Incapacitated: Unconscious (from dropping to 0 HP), Paralyzed, Petrified, Stunned, and direct Incapacitated. Any of these should block slot expenditure.

**Changes:**
- `creature.qnt`: `doExpendSlot` and `doExpendPactSlot` guarded by `isConscious(state) and pCanAct(state)`
- `machine-states.ts`: `EXPEND_SLOT` and `EXPEND_PACT_SLOT` given `canExpendSlot` guard
- `machine.ts`: added `canExpendSlot` guard (`c.hp > 0 && !isIncapacitated(c)`)

## A2: END_TURN as modeling convention

**Assumption:** END_TURN is an explicit event in the state machine that transitions a creature from `acting` to `waitingForTurn`.

**Rules basis (PHB Ch. 9):** D&D 5e has no explicit "end turn" action. Turns proceed through initiative order implicitly. However, "at the end of your turn" is a pervasive trigger point in the rules (repeated saves for condition spells, ongoing damage, effect expiry). At the table, players universally say "I end my turn." The state machine needs a discrete transition to prevent START_TURN spam and to process end-of-turn triggers.

**Changes:** Implemented in TA2. `creature.qnt`: added `turnPhase` state variable (`"outOfCombat"` | `"acting"` | `"waitingForTurn"`), `doEndTurn` action processing end-of-turn saves (remove effect + conditions on success), end-of-turn damage (with concentration checks), and clearing expired `AtEndOfTurn` effects. XState: `END_TURN` event on `acting` state transitions to `waitingForTurn`. MBT bridge maps `turnPhase` field-by-field.

## A3: Damage track state names

**Assumption:** The XState `damageTrack` parallel state uses four states: `alive`, `dying.unstable`, `dying.stable`, `dead`. The Quint spec tracks this via fields (`hp`, `dead`, `stable`) and the derived predicate `isConscious(s) = s.hp > 0 and not(s.dead)`.

**Rules basis:** The SRD 5.2.1 formally names only two of these states. "Stable" (Rules-Glossary): "A creature is Stable if it has 0 Hit Points but isn't required to make Death Saving Throws." "Dead" (Rules-Glossary): "A dead creature has no Hit Points and can't regain them unless it is first revived by magic." The SRD has no formal name for "hp > 0" or for "at 0 HP, making Death Saving Throws." Our names `alive` and `dying.unstable` are modeling inventions. We avoid "conscious" as a state name because it clashes with the Unconscious condition — a creature can be `alive` (hp > 0) while having the Unconscious condition (e.g., after being knocked out).

**Changes:**
- `machine-states.ts`: `damageTrack` states named `alive` / `dying.unstable` / `dying.stable` / `dead`
- `creature.qnt`: predicate `isConscious(s)` = `s.hp > 0 and not(s.dead)` (Quint predates this assumption; name kept for spec continuity)

## A4: Round = 6 seconds as atomic time unit

**Assumption:** The round (6 seconds) is the smallest time unit modeled. All durations are tracked as integer turn counts. No sub-round time tracking exists.

**Rules basis (PHB Ch. 9):** "A round represents about 6 seconds in the game world." Reactions, opportunity attacks, and reaction spells (Shield, Counterspell) are interrupt-style triggers within the round framework, not smaller time quanta. No spell or ability uses a duration shorter than 1 round. The phrase "until the end of this turn" (same-turn, sub-round duration) does not appear anywhere in the rules.

**Changes:** Duration tracking implemented in TA4.

## A5: Single-creature turn = 1 round for duration tracking

**Assumption:** In the single-creature model, each START_TURN/END_TURN cycle represents one round passing. Effect duration counters decrement by 1 per cycle regardless of when the effect was applied relative to initiative order.

**Rules basis:** This is a simplification. In multi-creature combat, a round is one full pass through the initiative order. An effect cast mid-round by another creature would technically expire at that creature's turn N rounds later, not at our turn. In a single-creature model we only observe our own turns, so each turn = 1 round is the only tractable approach. The caller is responsible for providing correct initial duration values accounting for initiative-order offset if needed.

**Changes:** Implemented in TA4. `creature.qnt`: `pStartTurnFull` decrements durations and clears expired effects per cycle. XState: `computeStartTurn` in `machine-startturn.ts` mirrors this.

## A6: Death save precedes start-of-turn effect processing

> **TODO: RAW violation.** The SRD 5.2.1 Simultaneous Effects rule (Rules-Glossary) explicitly states: "If two or more things happen at the same time on a turn, the person at the game table — player or GM — whose turn it is decides the order in which those things happen." This means the player should be able to choose whether the death save or start-of-turn effects resolve first. The current fixed ordering violates RAW. Fix: model this as a caller-provided input (the player's choice of ordering), not a hardcoded sequence.

**Assumption:** At the start of a turn, the death save (if applicable) resolves before any start-of-turn spell effects (heals, damage, temp HP, saves).

**Rules basis (SRD 5.2.1 Rules-Glossary "Death Saving Throw"):** "Whenever you start your turn with 0 Hit Points, you must make a Death Saving Throw." This is a mandatory, first-order rule. Start-of-turn spell effects (e.g., Regenerate's heal, Searing Smite's burn) trigger "at the start of your turn" at the same timing point but are optional/conditional. The death save resolves first because: (a) it is mandatory, (b) a natural 20 changes the creature's conscious state (hp 0→1), which affects subsequent processing, (c) death from 3 failures makes subsequent effects irrelevant.

**Changes:** Implemented in TA4. `creature.qnt`: `pStartTurnFull` calls `pDeathSave` (step 3) before `pProcessStartOfTurn` (step 4). XState: `computeStartTurn` follows the same order.

## A7: Incapacitated creatures cannot start concentration

**Assumption:** START_CONCENTRATION is blocked when the creature is dead or incapacitated.

**Rules basis (SRD 5.2.1 Rules-Glossary "Incapacitated [Condition]"):** "An Incapacitated creature can't take any action, Bonus Action, or Reaction." Casting a spell (which starts concentration) requires an action or bonus action. Therefore incapacitated creatures cannot start new concentration.

**Changes:** Implemented in TA4. `creature.qnt`: `doStartConcentration` guarded by `not(isIncapacitated(state))`. XState: `canConcentrate` guard on both START_CONCENTRATION handlers in `machine-states.ts`.

## A8: Two-Weapon Fighting requires melee weapons

**Assumption:** `pCanTWFWithWeapons` requires both weapons to have the Light property AND be melee weapons.

**Rules basis (Equipment.md "Light [Weapon Property]"):** SRD 5.2.1 says "when you take the Attack action on your turn and attack with a Light weapon, you can make one extra attack as a Bonus Action later on the same turn with a different Light weapon." The 5.2.1 text is silent on whether the weapons must be melee. SRD 5.1 explicitly required "light melee weapon." We retain the melee-only requirement because: (a) all Light weapons in the SRD equipment tables are melee weapons (Hand Crossbow is Light but one-handed, and TWF requires a weapon "in the other hand"), (b) removing the constraint would allow dual-wielding hand crossbows RAW, which contradicts the Ammunition property's "one hand free to load" requirement, and (c) the constraint is strictly more conservative than the SRD text.

**Changes:** No code changes. Documents existing `pCanTWFWithWeapons` behavior in `creature.qnt` and `canTwoWeaponFight` in XState.

## A9: Multiclass Channel Divinity — additive per-class pools

**Assumption:** `pChannelDivinityMax(config)` sums `pClericChannelDivinityMax` and `pPaladinChannelDivinityMax` independently based on each class's level. A Cleric 6 / Paladin 3 would have max 3 + 2 = 5 uses, drawn from a single shared charges counter.

**Rules basis:** SRD 5.2.1 Cleric (L2) and Paladin (L3) both say "this class's Channel Divinity," implying per-class tracking. However, the SRD 5.2.1 does not include explicit multiclass rules for Channel Divinity. The 5.1 PHB multiclass rules stated that gaining Channel Divinity from a second class does not grant additional uses — only additional effect options. We model additive pools as a permissive interpretation of 5.2.1's per-class language, which diverges from 5.1 intent (5.1 said no extra uses). This assumption can be revised if official 5.2.1 multiclass guidance clarifies.

**Changes:** `creature.qnt`: `pChannelDivinityMax` sums per-class max functions. No XState changes (framework only).

## A10: Ritual casting — caller-orchestrated, no slot expenditure

**Assumption:** Ritual casting is modeled as the absence of slot expenditure. The caller skips `pExpendSlot` and optionally calls `pStartConcentration` if the spell requires it. The old `canRitualCast: bool` config flag was removed — ritual casting is universal in 5.2.1.

**Rules basis (SRD 5.2.1 Rules Glossary, "Ritual"):** "If you have a spell prepared that has the Ritual tag, you can cast that spell as a Ritual. The Ritual version of a spell takes 10 minutes longer to cast than normal. It also doesn't expend a spell slot, which means the ritual version of a spell can't be cast at a higher level."

**Why no dedicated function:** The spec has no composite "cast spell" action — slot expenditure, concentration, and effects are separate events. Ritual casting means the caller orchestrates the same events minus `pExpendSlot`. Whether the spell requires concentration is a separate property of the spell, not of ritual casting itself. A `pCastAsRitual` wrapper would conflate ritual casting with concentration.

**What's not modeled:** Casting time (+10 minutes — spec doesn't model time beyond action/bonus action). Spell identity and Ritual tag (spec models slots, not individual spells). Spell preparation lists. Wizard "Ritual Adept" (class feature for `features/`).

**Changes:** Removed `canRitualCast: bool` from `CharConfig` (5.2.1 made ritual casting universal). No new function needed — ritual casting is the caller choosing not to call `pExpendSlot`.

## A11: Ongoing damage respects creature R/V/I

**Assumption:** End-of-turn and start-of-turn ongoing damage (e.g., Heat Metal, Spirit Guardians) applies creature resistances, vulnerabilities, and immunities. The R/V/I are provided per damage entry by the caller.

**Rules basis (SRD 5.2.1 "Damage Resistance/Vulnerability"):** "Resistance and then Vulnerability are applied after all other modifiers to damage." No exception is made for ongoing damage — resistances always apply unless a feature explicitly states otherwise.

**Changes:** `creature.qnt`: Added `resistances`, `vulnerabilities`, `immunities` fields to `EndOfTurnDamage` and `StartOfTurnEffect` types. `pProcessEndOfTurnDamage` and `pProcessStartOfTurn` now pass these to `pTakeDamage` instead of empty sets. XState: matching fields added to event types and passed through in `machine-endturn.ts` and `machine-startturn.ts`.

## A12: Monsters die at 0 HP (death saves are PC-only per RAW)

**Assumption:** Monsters die immediately at 0 HP. PCs enter the death save track (unconscious at 0 HP, death save failures on subsequent hits, start-of-turn death save rolls). The spec gates this on a `creatureKind` discriminator (`PC | Monster`).

**Rules basis (SRD 5.2.1 Playing-the-Game):** "Monster Death: A monster dies the instant it drops to 0 Hit Points, although a Game Master can ignore this rule for an individual monster and treat it like a character." Death saves: "A player character must make a Death Saving Throw if they start their turn with 0 Hit Points" (Rules Glossary). The spec does not model DM fiat to allow monster death saves.

**Changes:** `creature.qnt`: `pTakeDamageAsCreature` takes a `kind: CreatureKind` parameter. PC path: existing behavior (unconscious at 0 HP, death save failures). Monster path: `dead = true` at 0 HP, no unconscious, no death saves. `pTakeDamage` wrapper passes `PC` for backward compatibility. `doStartTurn` passes `deathSaveRoll = 0` for monsters (skip). `pMonsterDeathCheck` clears spurious `unconscious` flag after monster damage.

## A13: Monster AC is a flat integer from the stat block

**Assumption:** Monster AC is a flat integer from the stat block. The spec does not model how natural armor + DEX produces that value -- the SRD gives us the final number directly.

**Rules basis (SRD 5.2.1 Monsters > Overview > Armor Class):** "A monster's Armor Class (AC) includes its natural armor, Dexterity, gear, and other defenses." The stat block lists the final AC value.

**Changes:** `StatBlock.ac` is a plain `int` in both Quint and TypeScript. No armor formula derivation.

## A14: Exhaustion immunity is separate from condition immunities

**Assumption:** Exhaustion immunity is a separate boolean, not part of `conditionImmunities: Set[Condition]`. Exhaustion is not one of the 14 SRD Conditions -- it is a leveled mechanic (1-6) stored as an integer.

**Rules basis (SRD 5.2.1 Rules Glossary):** The 14 Conditions are: Blinded, Charmed, Deafened, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious. Exhaustion is described separately as a leveled mechanic with cumulative effects at levels 1-6.

**Changes:** `StatBlock.exhaustionImmune: bool` in Quint and TypeScript. `pAddExhaustion` checks this flag independently of `conditionImmunities`.

## A15: CR encoded as sum type with fractional special cases

**Assumption:** CR encoded as sum type: `CR0 | CR_Eighth | CR_Quarter | CR_Half | CRN(int)`. Fractional CRs are special cases with specific PB/XP values that don't follow the integer formula.

**Rules basis (SRD 5.2.1 Monsters > Overview):** The CR table lists CR 0, 1/8, 1/4, 1/2 as distinct entries with specific XP values (0/10, 25, 50, 100) that don't fit the integer CR pattern. All integer CRs (1-30) follow a regular PB progression.

**Changes:** `ChallengeRating` sum type in Quint (`creature.qnt`) and discriminated union in TypeScript (`monster-types.ts`). `crToProficiencyBonus` function handles all variants.

## A16: Dead creatures: effect processing continues, heal/damage are no-ops

**Assumption:** When a creature dies mid-turn (e.g., from a death save during START_TURN), remaining start-of-turn and end-of-turn effects continue processing. Saves still remove effects. Temp HP grants still apply (temp HP is not HP). Healing and damage are no-ops on dead creatures. Generic post-death condition application/removal is also a no-op unless a source-owned revival/effect rule explicitly changes the condition; conditions that existed at death persist while their durations are ongoing.

**Rules basis (SRD 5.2.1 Rules Glossary "Dead"):** "A dead creature has no Hit Points and can't regain them." The same entry says that, unless otherwise stated, a revived creature returns with ongoing conditions, magical contagions, or curses that affected it at death. The SRD does not define whether ongoing effects continue to tick on a dead creature's turn — dead creatures don't take turns in practice. This assumption makes the modeling choice explicit: the effect loop runs to completion (matching a fold over all effects), but operations that the SRD implicitly blocks (healing, damage) or leaves to source-owned revival/effect rules (post-death condition mutation) are skipped.

**Changes:** `creature.qnt`: `pProcessStartOfTurn` fold has no dead-break; `pHeal` and `pTakeDamage` check `s.dead` internally; `pGrantTempHp` does not check dead. XState: `computeStartTurn` (`machine-startturn.ts`) removed `if (dead) break`, guards heal/damage with `!dead`, leaves tempHp unguarded. `computeEndTurn` (`machine-endturn.ts`) uses `if (dead) continue` for damage loop.

## A17: Standing from prone requires nonzero movement cost

**Assumption:** Standing from prone requires spending movement equal to half your speed (round down). If this cost rounds to 0 (e.g., speed 1 → floor(1/2) = 0), the creature cannot stand — the attempt is a no-op. This is stricter than a literal reading of RAW, which only gates on "Speed is 0."

**Rules basis (SRD 5.2.1 Rules Glossary "Prone"):** "spend an amount of movement equal to half your Speed (round down) to right yourself … If your Speed is 0, you can't right yourself." RAW explicitly blocks speed 0. For speed 1 (cost = 0), the SRD is silent. The spec interprets "spend movement" as requiring a nonzero expenditure — you cannot stand for free. This matches Quint's structural equality check: if no movement is spent, the turn state is unchanged, so prone persists.

**Changes:** `creature.qnt`: `doStandFromProne` uses `t1 != turnState` (structural equality) — zero-cost stand produces identical state, so prone is not removed. XState: `spendHalfSpeed` (`machine-helpers.ts`) returns `success: false` when `cost <= 0`.

## A18: Multiattack maps to extraAttacksRemaining

**Assumption:** A monster's Multiattack maps to `extraAttacksRemaining = length(multiattack) - 1`. The first attack consumes the Attack action; remaining attacks use extra attacks. A monster with no Multiattack has `extraAttacksRemaining = 0`.

**Rules basis (SRD 5.2.1 Monsters > Overview, "Multiattack"):** "Some creatures can make more than one attack when they take the Attack action. [...] This entry details the attacks a creature can make, as well as any additional abilities it can use, as part of the Attack action." In 5.2.1, Multiattack is explicitly part of the Attack action (unlike 5.1 where it was a separate action).

**Simplification:** The spec reuses the `extraAttacksRemaining` counter for both Multiattack and PC Extra Attack. This is an architectural convenience — the action economy (one action → N strikes) is structurally the same. However, the SRD mechanics differ in important ways not currently modeled:
- **Extra Attack** (PC) allows substituting any attack for a Grapple or Shove (SRD 5.2.1 Rules Glossary: "you can replace one of your attacks" with Grapple/Shove). **Multiattack** specifies fixed attack combinations — the monster makes the listed attacks, not arbitrary substitutions.
- **Extra Attack** scales with class level (Fighter gets 2/3/4 attacks). **Multiattack** is fixed per stat block.
- **Extra Attack** allows free choice of weapon per attack. **Multiattack** lists specific named attacks (e.g., "two Claw attacks and one Bite").

These distinctions are caller-side concerns (which attacks to resolve, whether grapple/shove substitution is allowed). The spec's action-economy counter treats both as "N attacks per Attack action" and leaves attack identity to the caller.

**Changes:** `creature.qnt`: `doStartTurn` computes `monsterExtraAttacks = multiattack.length() - 1` and sets `extraAttacksRemaining` on the turn state. `MultiattackSlot` sum type (`MAttack(str) | MSpecialAbility(str)`) supports heterogeneous multiattacks. `init` sets `extraAttacksRemaining` from the selected stat block's multiattack length.

## A19: Legendary Action timing in single-creature model

**Assumption:** Legendary Actions fire during `turnPhase == "waitingForTurn"`. In the SRD, a Legendary Action is taken "immediately after another creature's turn." Since the spec models a single creature, `waitingForTurn` represents the window between the creature's own turns — this is when other creatures would act.

**Rules basis (SRD 5.2.1 Monsters > Legendary Actions):** "A Legendary Action is an action that a monster can take immediately after another creature's turn." The spec's single-creature model cannot represent interleaved turns. Using `waitingForTurn` as the proxy is the closest structural equivalent.

**Changes:** `creature.qnt`: `doUseLegendaryAction` guards on `turnPhase == "waitingForTurn"`.

## A20: Legendary Resistance as caller decision

**Assumption:** Whether to use Legendary Resistance on a failed save is a caller-provided boolean (`useLR`), not an automatic optimization. The spec does not decide when LR is "worth using" — that is a tactical judgment left to the caller.

**Rules basis (SRD 5.2.1 Monsters > Traits, "Legendary Resistance"):** "If the dragon fails a saving throw, it can choose to succeed instead." The word "choose" makes it a tactical decision.

**Changes:** `creature.qnt`: `doEndTurn` adds `nondet useLR = Bool.oneOf()` and applies `pUseLegendaryResistance` to override the save result when the monster fails and LR is available. XState: `END_TURN` event accepts `useLegendaryResistance?: boolean`.

## A21: Recharge rolls as event arguments

**Assumption:** Recharge d6 rolls are nondeterministic values generated at the start of a monster's turn, not pre-computed or automatic. A single roll value is used for all unavailable recharge abilities on that turn.

**Rules basis (SRD 5.2.1 Monsters > Limited Usage, "Recharge X–Y"):** "At the start of each of the monster's turns, roll 1d6." The roll is per-ability in the SRD, but using a single nondet value simplifies the spec's state space. Since the spec currently models at most one recharge ability per monster, this is equivalent.

**Changes:** `creature.qnt`: `doStartTurn` monster path adds `nondet rechargeRollVal = 1.to(6).oneOf()` and builds `RechargeRollEvent` for each unavailable ability. `pProcessRechargeRolls` checks each roll against the ability's `rechargeMin`.

## A22: Resource refresh timing

**Assumption:** Legendary Actions refresh at the start of the monster's turn. Legendary Resistance and daily abilities refresh on Long Rest. Recharge abilities refresh on both Short Rest and Long Rest.

**Rules basis (SRD 5.2.1):** "The monster regains all expended [Legendary Action] uses at the start of each of its turns." "Legendary Resistance (3/Day)" — the "/Day" implies daily refresh. Recharge abilities have no explicit rest refresh rule in the SRD, but are conventionally available after rests.

**Changes:** `creature.qnt`: `doStartTurn` calls `pRefreshLegendaryActions`. `doShortRest` calls `pRefreshRechargeAbilities`. `doLongRest` calls `pRefreshRechargeAbilities`, `pRefreshDailyAbilities`, and resets `legendaryResistancesRemaining`.

## A23: Lair bonus derivation

**Assumption:** The `inLair: bool` field on `StatBlock` adds +1 to both Legendary Action and Legendary Resistance effective maximums. This bonus is applied at initialization (`pInitMonsterResources`) and at refresh time (`pRefreshLegendaryActions`, long rest LR reset). It is not dynamically toggled during combat.

**Rules basis (SRD 5.2.1, Adult Red Dragon):** "Legendary Action Uses: 3 (4 in Lair)" and "Legendary Resistance (3/Day, or 4/Day in Lair)." The parenthetical suggests lair status is determined before the encounter, not mid-combat.

**Changes:** `creature.qnt`: `pInitMonsterResources` computes `base + (if inLair then 1 else 0)`. `pRefreshLegendaryActions` takes `maxUses` and `inLair` and applies the same formula.

## A24: Legendary Action cooldowns left to caller

**Assumption:** Per-action-name cooldowns (e.g., "The dragon can't take this action again until the start of its next turn" for Commanding Presence and Fiery Rays) are NOT modeled in the spec. The spec tracks only the global legendary action use count, not which specific actions were used this round.

**Rules basis (SRD 5.2.1, Adult Red Dragon > Legendary Actions):** "The dragon can't take this action again until the start of its next turn." This is a per-action identity constraint. Modeling it would require a `Set[str]` of used action names, cleared at start of turn. Since the spec focuses on resource economy rather than tactical action selection, this constraint is left to the caller.

**Changes:** None — documented as an intentional omission.

## A25: Init class selection (Fighter or Barbarian)

**Assumption:** The Quint `init` action nondeterministically selects either Fighter or Barbarian as the PC's class. The selected class gets level `l` (from `Set(3, 5, 9, 10, 18)`); the other gets level 0 with zeroed charges. Monsters always have both at level 0.

**Rules basis:** D&D 5e supports multiclassing, but the spec models single-class PCs for tractability. The choice is a nondeterministic parameter to exercise both class state machines in MBT traces.

**Changes:** `creature.qnt`: `init` adds `nondet pcClass = Set("Fighter", "Barbarian").oneOf()`, sets `fighterLevel`/`barbarianLevel` based on selection. `creature.mbt.test.ts`: init handler reads `pcClass` and sets levels accordingly.

## A26: Rage maintenance timing

**Assumption:** Rage maintenance is checked at the start of the barbarian's next turn, using flags from the previous turn (`attackedOrForcedSaveThisTurn`, `rageExtendedWithBA`). If neither flag is set and level < 15 (Persistent Rage), rage ends.

**Rules basis (SRD 5.2.1 Barbarian L1 "Rage > Duration"):** "The Rage lasts until the end of your next turn, and it ends early if you don Heavy armor or have the Incapacitated condition. If your Rage is still active on your next turn, you can extend the Rage for another round by doing one of the following: Make an attack roll against an enemy. Force an enemy to make a saving throw. Take a Bonus Action to extend your Rage."

The SRD says rage "lasts until the end of your next turn" — checking maintenance at the start of the next turn (before the turn's actions) is equivalent: if you didn't maintain it during your previous turn, it expires before you can act.

**Changes:** `creature.qnt`: `pBarbarianStartTurn` calls `pCheckRageMaintenance` before resetting per-turn flags. XState: `barbarianStartTurnUpdate` mirrors this logic.

## A27: TS-only barbarian features

**Assumption:** Brutal Strike effects (Forceful Blow, Hamstring Blow, Staggering Blow, Sundering Blow), Frenzy bonus damage, Danger Sense advantage, and Relentless Rage save resolution remain TS-only features. These are caller-side composition (e.g., applying extra damage dice, granting advantage on DEX saves) rather than resource tracking, so they don't need Quint state variables.

**Rules basis:** These features modify attack rolls, damage totals, or saving throws — all computed by the caller using the existing spec mechanics (damage, advantage, saves). The spec tracks only the resource charges and state flags that constrain when these features can be used.

**Changes:** Retaliation after-damage reaction eligibility is modeled in `battle.qnt` from battle-owned trigger qualifiers. The remaining TS-only features are implemented in `class-barbarian.ts`.

## A28: Persistent Rage modeling

**Assumption:** Persistent Rage (L15+) is modeled by skipping the rage maintenance check in `pCheckRageMaintenance`. The SRD says rage "lasts for 10 minutes without you needing to do anything to extend it" — we model this as `rageTurnsRemaining = 100` (10 min ≈ 100 rounds) with no maintenance required. Rage can still end early from Unconscious condition or donning Heavy armor (caller responsibility).

**Rules basis (SRD 5.2.1 Barbarian L15 "Persistent Rage"):** "Your Rage is so fierce that it now lasts for 10 minutes without you needing to do anything to extend it from round to round. Your Rage ends early if you have the Unconscious condition (not just the Incapacitated condition) or don Heavy armor."

**Changes:** `creature.qnt`: `pCheckRageMaintenance` returns early (no-op) when `barbarianLevel >= 15`. XState: `barbarianStartTurnUpdate` mirrors this.

## A29: MonkState scope — caller-side features

**Assumption:** Most Monk features are caller-side composition (D4 from plan): Martial Arts die, Unarmored Movement, Unarmored Defense AC, Evasion, Deflect Attacks damage reduction, Slow Fall, Open Hand Technique target effects (Addle/Push/Topple), Focus-Empowered Strikes, Self-Restoration, Disciplined Survivor, Perfect Focus, Fleet Step, Quivering Palm. The Quint spec only models resource tracking: Focus Points, Stunning Strike per-turn flag, Wholeness of Body charges, and Uncanny Metabolism once-per-long-rest flag.

**Rules basis (SRD 5.2.1 Monk):** These features modify damage, AC, saves, or apply effects to targets — all caller-side concerns that the spec cannot observe without modeling two combatants.

**Changes:** `creature.qnt`: `MonkState` has 6 fields. `machine-monk.ts`: delegates to `class-monk.ts` and `class-monk-features.ts` for calculations.

## A30: Wholeness of Body — WIS modifier range

**Assumption:** Wholeness of Body max charges equal the monk's Wisdom modifier. Since the spec doesn't track ability scores, `wholenessMax` is derived from a nondeterministic `wisMod` (range 1–5) at init. The TS side uses `wholenessOfBodyMaxCharges(wisMod)` which clamps to `max(1, wisMod)`.

**Rules basis (SRD 5.2.1 Warrior of the Open Hand L6 "Wholeness of Body"):** "You gain a number of uses equal to your Wisdom modifier (minimum of 1 use)."

**Changes:** `creature.qnt`: `freshMonkState` takes `wholenessMax` parameter. `init` generates `nondet wisMod = 1.to(5).oneOf()`.

## A31: Uncanny Metabolism — modeled as player action, not auto-trigger

**Assumption:** Uncanny Metabolism triggers "when you roll Initiative" but is modeled as an available action during the `acting` phase (player choice at initiative) rather than auto-triggering in `doStartTurn`. This preserves player agency — the player may choose not to use it if Focus Points are already full.

**Rules basis (SRD 5.2.1 Monk L2 "Uncanny Metabolism"):** "When you roll Initiative, you can regain all expended Focus Points." The word "can" implies optional.

**Changes:** `creature.qnt`: `doUncannyMetabolism` is a separate action in `stepPC`, not wired into `doStartTurn`. Heal amount = `monkLevel + healRoll` (martial arts die abstracted as nondet 1–12).

## A32: Trigger taxonomy — inferred from reaction catalog (battle layer)

**Assumption:** The SRD does not define a closed set of "trigger types." Each reaction specifies its trigger in natural language (e.g., "when you are hit by an attack roll"). The battle layer infers 11 trigger categories by grouping reactions that fire at the same game moment. This taxonomy is a modeling decision — the SRD does not name or enumerate these categories.

**Rules basis:** Every reaction trigger phrase in SRD 5.2.1 maps to exactly one of: ATTACK_HITS, ATTACK_DAMAGES, DAMAGE_TAKEN, SPELL_BEING_CAST, LEAVES_REACH, FALLS, SAVE_FAILED, TURN_STARTS, TURN_ENDS, MOVE_ENDS, ALLY_TAKES_ATTACK_ACTION. See `battle/REQUIREMENTS.md` R50 for the full mapping with SRD references.

**Why this matters:** The battle machine needs a finite set of interrupt points to check for eligible reactions. Without this taxonomy, the machine would need to pattern-match on natural language trigger descriptions. The taxonomy collapses 26+ reaction trigger phrases into 11 categories with identical game-moment semantics.

## A33: Mid-combat creature roster changes — DM discretion

**Assumption:** Creatures can enter and leave combat at any time. Reinforcements arrive, creatures flee, summons appear. The SRD does not prescribe rules for when or how this happens — it is DM discretion. The battle spec models a mutable creature set (insert/remove operations on the creature map).

**Initiative for new arrivals:** The SRD does not specify how a creature joining mid-combat enters the initiative order. The spec treats this as caller-provided: the caller supplies the initiative count when inserting a new creature.

**Dead/unconscious creatures in initiative:** The SRD does not explicitly remove dead or unconscious creatures from initiative order. Dead monsters are implicitly removed (they cease to exist). Unconscious PCs remain in initiative but are Incapacitated (can't act, speed 0). The spec keeps dead/unconscious creatures in the initiative list until explicitly removed by the caller.

**Summoned creature initiative:** Varies by spell. Find Familiar: rolls own initiative. Find Steed / Summon Dragon: shares caster's initiative count, acts on caster's turn or immediately after. Conjure spells (Animals, Elemental, etc.): no independent turn — act as effects under caster control.

**Rules basis:** Playing-the-Game.md states "Everyone involved in the combat encounter rolls Initiative" at start, and "The Initiative order remains the same from round to round." No rules for mid-combat changes. Combat ends "when one side or the other is defeated, which can mean the creatures are killed or knocked out or have surrendered or fled" — but no explicit removal from initiative on individual death/flee.

## A35: Environmental hazards beyond falling/underwater — DM agenda

**Assumption:** Lava, extreme weather, traps, and similar environmental hazards are not modeled. The SRD describes these as DM-narrated events with DM-set DCs and damage. The spec models the *mechanical consequences* (damage, conditions) as caller-provided inputs; the hazard itself is DM agenda.

## A36: Summoned creature stat blocks — content layer

**Assumption:** The battle spec models adding/removing creatures mid-combat (A33) but does not model summoning *spell effects* (specific stat blocks, durations, caster-control rules). These belong in `features/spell-*.ts` as content, not in the Quint spec.

## A34: Spell durations are non-negative

**Assumption:** Spell effect durations (tracked as `turnsRemaining` on `ActiveEffect`) are non-negative integers. When a duration reaches 0, the effect ends and is removed. Negative durations do not exist. (This note does not imply that other non-mentioned durations are negative.)

**Rules basis:** The SRD describes durations as positive time spans ("1 minute," "Concentration, up to 10 minutes," etc.) that simply end when expired. No SRD passage addresses negative durations because the concept does not exist in the rules.

**Changes:** Invariant `turnsRemaining >= 0` added to safety invariants (see PLAN_INVARIANTS.md L2).

## A37: Grapple Movable cost modeled as speed halving

**Assumption:** The SRD 5.2.1 Grappled condition's Movable property says "every foot of movement costs it 1 extra foot unless you are Tiny or two or more sizes smaller than it." The spec models this as halving `effectiveSpeed` at start-of-turn (`pStartTurn`) rather than tracking a per-foot movement cost multiplier.

**Rules basis:** The result is identical for all movement cases — 30 ft speed with double cost yields 15 ft of dragging, same as 15 ft effective speed. This holds through Dash (which adds `effectiveSpeed` to `movementRemaining`), difficult terrain stacking, and all other movement modifiers. The representation differs from RAW language but produces the same mechanical outcome.

**Rationale:** The spec tracks movement as a budget (`movementRemaining`) decremented by 1 per foot, not as a cost-per-foot system. Modeling Movable as a cost multiplier would require changing the movement system to track per-foot costs for grappling, difficult terrain, squeezing, etc. Halving speed is the simplest representation that preserves correctness.

**Changes:** `pStartTurn` in `creature.qnt` applies `afterExhaustion / 2` when `isGrappling and not(grappledTargetTwoSizesSmaller)`.

## A38: Creature-level prepared spell casting models deterministic prepared-spell defaults and caster-side bookkeeping only

**Assumption:** The creature-level `CAST_PREPARED_SPELL` action does not model full player-chosen prepared spell lists or downstream spell effects. It models only caster-side bookkeeping:
- spend a regular spell slot
- consume Action or Bonus Action based on casting time
- mark one-slot-per-turn flags
- start/replace concentration for modeled concentration spells

When explicit prepared-spell input is absent, the TypeScript machine and `creature.qnt` both derive the same deterministic modeled subset from class levels and available regular spell slots. This subset is intentionally narrow and exists to support available-actions/MCP coverage and MBT parity.

**Rules basis:** The SRD defines prepared spells as character-build choices ("choose spells ... The chosen spells must be of a level for which you have spell slots"), but the helper creature spec does not model spellbook contents or player preparation choices as separate authored state. The battle spec remains the authoritative combat-spec layer for concrete spell identity/effect resolution.

**Modeled subset in Phase 3:** `bless`, `burning_hands`, `fireball`, `guiding_bolt`, `haste`, `healing_word`, `hold_person`, `inflict_wounds`, `spirit_guardians`.

**Out of scope for this phase:** Cantrips, ritual casting, reaction spells, pact-slot casting, slot-free class/subclass spell casts, target/effect resolution, and full class spell-list/preparation management.

**Changes:**
- `creature.qnt`: adds `doCastPreparedSpell`, deterministic `pDefaultPreparedSpells`, and spell-casting bookkeeping helpers.
- TypeScript machine: adds `CAST_PREPARED_SPELL`, `preparedSpells` input/context, and default prepared-spell derivation when explicit input is omitted.
- MBT bridge: adds `CAST_PREPARED_SPELL` driver mapping and compares `slotExpendedThisTurn` from the real creature machine state.
