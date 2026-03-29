# Modeling Assumptions

The spec (`dnd.qnt`) maintains direct feature parity with the SRD. Formalizing prose rules into a state machine sometimes requires making explicit what the SRD leaves implicit — adding events the rules assume (END_TURN), connecting constraints that follow logically but aren't stated verbatim (slot expenditure requires ability to act), or choosing a formalization where the architecture demands one (single-creature time tracking). These modeling decisions are documented here. They are curated by the project owner, kept minimal, and stay close to RAW.

Each entry records the assumption, rules justification, and what changed in both Quint and XState.

## A1: Spell slot expenditure requires ability to act

**Assumption:** EXPEND_SLOT and EXPEND_PACT_SLOT are only valid when alive (hp > 0, not dead) AND not incapacitated.

**Rules basis (PHB Ch. 10, Ch. 12):** Casting a spell requires an action or bonus action. The Incapacitated condition (PHB Ch. 12) prevents taking actions or reactions. Multiple conditions impose Incapacitated: Unconscious (from dropping to 0 HP), Paralyzed, Petrified, Stunned, and direct Incapacitated. Any of these should block slot expenditure.

**Changes:**
- `dnd.qnt`: `doExpendSlot` and `doExpendPactSlot` guarded by `isConscious(state) and pCanAct(state)`
- `machine-states.ts`: `EXPEND_SLOT` and `EXPEND_PACT_SLOT` given `canExpendSlot` guard
- `machine.ts`: added `canExpendSlot` guard (`c.hp > 0 && !isIncapacitated(c)`)

## A2: END_TURN as modeling convention

**Assumption:** END_TURN is an explicit event in the state machine that transitions a creature from `acting` to `waitingForTurn`.

**Rules basis (PHB Ch. 9):** D&D 5e has no explicit "end turn" action. Turns proceed through initiative order implicitly. However, "at the end of your turn" is a pervasive trigger point in the rules (repeated saves for condition spells, ongoing damage, effect expiry). At the table, players universally say "I end my turn." The state machine needs a discrete transition to prevent START_TURN spam and to process end-of-turn triggers.

**Changes:** Implemented in TA2. `dnd.qnt`: added `turnPhase` state variable (`"outOfCombat"` | `"acting"` | `"waitingForTurn"`), `doEndTurn` action processing end-of-turn saves (remove effect + conditions on success), end-of-turn damage (with concentration checks), and clearing expired `AtEndOfTurn` effects. XState: `END_TURN` event on `acting` state transitions to `waitingForTurn`. MBT bridge maps `turnPhase` field-by-field.

## A3: Damage track state names

**Assumption:** The XState `damageTrack` parallel state uses four states: `alive`, `dying.unstable`, `dying.stable`, `dead`. The Quint spec tracks this via fields (`hp`, `dead`, `stable`) and the derived predicate `isConscious(s) = s.hp > 0 and not(s.dead)`.

**Rules basis:** The SRD 5.2.1 formally names only two of these states. "Stable" (Rules-Glossary): "A creature is Stable if it has 0 Hit Points but isn't required to make Death Saving Throws." "Dead" (Rules-Glossary): "A dead creature has no Hit Points and can't regain them unless it is first revived by magic." The SRD has no formal name for "hp > 0" or for "at 0 HP, making Death Saving Throws." Our names `alive` and `dying.unstable` are modeling inventions. We avoid "conscious" as a state name because it clashes with the Unconscious condition — a creature can be `alive` (hp > 0) while having the Unconscious condition (e.g., after being knocked out).

**Changes:**
- `machine-states.ts`: `damageTrack` states named `alive` / `dying.unstable` / `dying.stable` / `dead`
- `dnd.qnt`: predicate `isConscious(s)` = `s.hp > 0 and not(s.dead)` (Quint predates this assumption; name kept for spec continuity)

## A4: Round = 6 seconds as atomic time unit

**Assumption:** The round (6 seconds) is the smallest time unit modeled. All durations are tracked as integer turn counts. No sub-round time tracking exists.

**Rules basis (PHB Ch. 9):** "A round represents about 6 seconds in the game world." Reactions, opportunity attacks, and reaction spells (Shield, Counterspell) are interrupt-style triggers within the round framework, not smaller time quanta. No spell or ability uses a duration shorter than 1 round. The phrase "until the end of this turn" (same-turn, sub-round duration) does not appear anywhere in the rules.

**Changes:** Duration tracking implemented in TA4.

## A5: Single-creature turn = 1 round for duration tracking

**Assumption:** In the single-creature model, each START_TURN/END_TURN cycle represents one round passing. Effect duration counters decrement by 1 per cycle regardless of when the effect was applied relative to initiative order.

**Rules basis:** This is a simplification. In multi-creature combat, a round is one full pass through the initiative order. An effect cast mid-round by another creature would technically expire at that creature's turn N rounds later, not at our turn. In a single-creature model we only observe our own turns, so each turn = 1 round is the only tractable approach. The caller is responsible for providing correct initial duration values accounting for initiative-order offset if needed.

**Changes:** Implemented in TA4. `dnd.qnt`: `pStartTurnFull` decrements durations and clears expired effects per cycle. XState: `computeStartTurn` in `machine-startturn.ts` mirrors this.

## A6: Death save precedes start-of-turn effect processing

**Assumption:** At the start of a turn, the death save (if applicable) resolves before any start-of-turn spell effects (heals, damage, temp HP, saves).

**Rules basis (SRD 5.2.1 Rules-Glossary "Death Saving Throw"):** "Whenever you start your turn with 0 Hit Points, you must make a Death Saving Throw." This is a mandatory, first-order rule. Start-of-turn spell effects (e.g., Regenerate's heal, Searing Smite's burn) trigger "at the start of your turn" at the same timing point but are optional/conditional. The death save resolves first because: (a) it is mandatory, (b) a natural 20 changes the creature's conscious state (hp 0→1), which affects subsequent processing, (c) death from 3 failures makes subsequent effects irrelevant.

**Changes:** Implemented in TA4. `dnd.qnt`: `pStartTurnFull` calls `pDeathSave` (step 3) before `pProcessStartOfTurn` (step 4). XState: `computeStartTurn` follows the same order.

## A7: Incapacitated creatures cannot start concentration

**Assumption:** START_CONCENTRATION is blocked when the creature is dead or incapacitated.

**Rules basis (SRD 5.2.1 Rules-Glossary "Incapacitated [Condition]"):** "An Incapacitated creature can't take any action, Bonus Action, or Reaction." Casting a spell (which starts concentration) requires an action or bonus action. Therefore incapacitated creatures cannot start new concentration.

**Changes:** Implemented in TA4. `dnd.qnt`: `doStartConcentration` guarded by `not(isIncapacitated(state))`. XState: `canConcentrate` guard on both START_CONCENTRATION handlers in `machine-states.ts`.

## A8: Two-Weapon Fighting requires melee weapons

**Assumption:** `pCanTWFWithWeapons` requires both weapons to have the Light property AND be melee weapons.

**Rules basis (Equipment.md "Light [Weapon Property]"):** SRD 5.2.1 says "when you take the Attack action on your turn and attack with a Light weapon, you can make one extra attack as a Bonus Action later on the same turn with a different Light weapon." The 5.2.1 text is silent on whether the weapons must be melee. SRD 5.1 explicitly required "light melee weapon." We retain the melee-only requirement because: (a) all Light weapons in the SRD equipment tables are melee weapons (Hand Crossbow is Light but one-handed, and TWF requires a weapon "in the other hand"), (b) removing the constraint would allow dual-wielding hand crossbows RAW, which contradicts the Ammunition property's "one hand free to load" requirement, and (c) the constraint is strictly more conservative than the SRD text.

**Changes:** No code changes. Documents existing `pCanTWFWithWeapons` behavior in `dnd.qnt` and `canTwoWeaponFight` in XState.

## A9: Multiclass Channel Divinity — additive per-class pools

**Assumption:** `pChannelDivinityMax(config)` sums `pClericChannelDivinityMax` and `pPaladinChannelDivinityMax` independently based on each class's level. A Cleric 6 / Paladin 3 would have max 3 + 2 = 5 uses, drawn from a single shared charges counter.

**Rules basis:** SRD 5.2.1 Cleric (L2) and Paladin (L3) both say "this class's Channel Divinity," implying per-class tracking. However, the SRD 5.2.1 does not include explicit multiclass rules for Channel Divinity. The 5.1 PHB multiclass rules stated that gaining Channel Divinity from a second class does not grant additional uses — only additional effect options. We model additive pools as a permissive interpretation of 5.2.1's per-class language, which diverges from 5.1 intent (5.1 said no extra uses). This assumption can be revised if official 5.2.1 multiclass guidance clarifies.

**Changes:** `dnd.qnt`: `pChannelDivinityMax` sums per-class max functions. No XState changes (framework only).

## A10: Ritual casting — caller-orchestrated, no slot expenditure

**Assumption:** Ritual casting is modeled as the absence of slot expenditure. The caller skips `pExpendSlot` and optionally calls `pStartConcentration` if the spell requires it. The old `canRitualCast: bool` config flag was removed — ritual casting is universal in 5.2.1.

**Rules basis (SRD 5.2.1 Rules Glossary, "Ritual"):** "If you have a spell prepared that has the Ritual tag, you can cast that spell as a Ritual. The Ritual version of a spell takes 10 minutes longer to cast than normal. It also doesn't expend a spell slot, which means the ritual version of a spell can't be cast at a higher level."

**Why no dedicated function:** The spec has no composite "cast spell" action — slot expenditure, concentration, and effects are separate events. Ritual casting means the caller orchestrates the same events minus `pExpendSlot`. Whether the spell requires concentration is a separate property of the spell, not of ritual casting itself. A `pCastAsRitual` wrapper would conflate ritual casting with concentration.

**What's not modeled:** Casting time (+10 minutes — spec doesn't model time beyond action/bonus action). Spell identity and Ritual tag (spec models slots, not individual spells). Spell preparation lists. Wizard "Ritual Adept" (class feature for `features/`).

**Changes:** Removed `canRitualCast: bool` from `CharConfig` (5.2.1 made ritual casting universal). No new function needed — ritual casting is the caller choosing not to call `pExpendSlot`.

## A11: Ongoing damage respects creature R/V/I

**Assumption:** End-of-turn and start-of-turn ongoing damage (e.g., Heat Metal, Spirit Guardians) applies creature resistances, vulnerabilities, and immunities. The R/V/I are provided per damage entry by the caller.

**Rules basis (SRD 5.2.1 "Damage Resistance/Vulnerability"):** "Resistance and then Vulnerability are applied after all other modifiers to damage." No exception is made for ongoing damage — resistances always apply unless a feature explicitly states otherwise.

**Changes:** `dnd.qnt`: Added `resistances`, `vulnerabilities`, `immunities` fields to `EndOfTurnDamage` and `StartOfTurnEffect` types. `pProcessEndOfTurnDamage` and `pProcessStartOfTurn` now pass these to `pTakeDamage` instead of empty sets. XState: matching fields added to event types and passed through in `machine-endturn.ts` and `machine-startturn.ts`.

## A12: Monsters die at 0 HP (no death saves)

**Assumption:** Monsters die immediately when reduced to 0 HP. They do not fall unconscious, do not make death saving throws, and do not accumulate death save failures from subsequent damage. Death saves are PC-only. The spec does not model DM fiat to allow monster death saves.

**Rules basis (SRD 5.2.1 Playing-the-Game, "Monster Death"):** "A monster dies the instant it drops to 0 Hit Points, although a Game Master can ignore this rule for an individual monster and treat it like a character." Death saving throws ("Whenever you start your turn with 0 Hit Points, you must make a Death Saving Throw") apply to player characters only.

**Changes:** `dnd.qnt`: `CreatureKind` discriminator (`PC | Monster`). `pTakeDamageAsCreature` branches on kind: monsters die at 0 HP, PCs enter death save track. `pMonsterDeathCheck` catches monster-at-0-HP from non-damage sources (suffocation, exhaustion, falls). Monster `doStartTurn` skips death saves. XState: `monsterDropsToZeroHp`, `monsterFallDropsToZero`, `monsterAtZeroHp` guards in `machine-guards.ts`, transitions in `machine-states.ts`.

## A13: Monster AC is a flat integer

**Assumption:** Monster AC is a flat integer from the stat block. The spec does not model how natural armor + DEX produces that value — the SRD gives us the final number directly.

**Rules basis (SRD 5.2.1 Monsters):** Monster stat blocks list AC as a single number, sometimes with a parenthetical explanation (e.g., "14 (natural armor)"). The derivation is flavor text; the value is authoritative.

**Changes:** `StatBlock.ac: int` in dnd.qnt.

## A14: Exhaustion immunity is separate from condition immunity

**Assumption:** Exhaustion immunity is a separate boolean (`exhaustionImmune: bool`), not part of `conditionImmunities: Set[Condition]`. Exhaustion is not one of the 14 SRD Conditions — it is a leveled mechanic (1-6) stored as an integer.

**Rules basis (SRD 5.2.1 Rules Glossary):** The 14 Conditions are listed separately from Exhaustion. Exhaustion has its own section with cumulative levels. Some monsters are immune to exhaustion (e.g., Skeleton stat block: "Immunities: ... Exhaustion").

**Changes:** `StatBlock.exhaustionImmune: bool` in dnd.qnt; `pAddExhaustion` already accepts `exhaustionImmune` parameter.

## A15: Multiattack maps to extra attacks remaining

**Assumption:** Multiattack maps to `extraAttacksRemaining = length(multiattack) - 1`. The first slot uses the Attack action; remaining slots use extra attacks. Complex Multiattack with mixed attack types is supported by the `List[MultiattackSlot]` type; the caller decides which `MonsterAttack` to resolve for each slot.

**Rules basis (SRD 5.2.1 Rules Glossary "Multiattack [Action]"):** "A monster that has the Multiattack action can make multiple attacks on its turn." The action economy is: one Attack action (consuming 1 action) that includes all the listed attacks. This parallels the PC Extra Attack feature.

**Changes:** `doStartTurn` for monsters sets `extraAttacksRemaining = length(multiattack) - 1`.

## A16: CR encoded as sum type

**Assumption:** CR is encoded as `CR0 | CR_Eighth | CR_Quarter | CR_Half | CRN(int)`. Fractional CRs are special cases with specific PB/XP values that don't follow the integer formula. CR 0 XP ambiguity (0 or 10 XP) is resolved by storing XP separately if needed.

**Rules basis (SRD 5.2.1 Monsters Overview):** CR values include 0, 1/8, 1/4, 1/2, and integers 1-30. Proficiency bonus is derived from CR via a table.

**Changes:** `ChallengeRating` type and `crToProficiencyBonus` function in dnd.qnt.
