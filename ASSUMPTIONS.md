# Modeling Assumptions

The spec (`dnd.qnt`) maintains direct feature parity with the SRD. Formalizing prose rules into a state machine sometimes requires making explicit what the SRD leaves implicit — adding events the rules assume (END_TURN), connecting constraints that follow logically but aren't stated verbatim (slot expenditure requires ability to act), or choosing a formalization where the architecture demands one (single-creature time tracking). These modeling decisions are documented here. They are curated by the project owner, kept minimal, and stay close to RAW.

Each entry records the assumption, rules justification, and what changed in both Quint and XState.

## A1: Spell slot expenditure requires ability to act

**Assumption:** EXPEND_SLOT and EXPEND_PACT_SLOT are only valid when conscious (hp > 0, not dead) AND not incapacitated.

**Rules basis (PHB Ch. 10, Ch. 12):** Casting a spell requires an action or bonus action. The Incapacitated condition (PHB Ch. 12) prevents taking actions or reactions. Multiple conditions impose Incapacitated: Unconscious (from dropping to 0 HP), Paralyzed, Petrified, Stunned, and direct Incapacitated. Any of these should block slot expenditure.

**Changes:**
- `dnd.qnt`: `doExpendSlot` and `doExpendPactSlot` guarded by `isConscious(state) and pCanAct(state)`
- `machine-states.ts`: `EXPEND_SLOT` and `EXPEND_PACT_SLOT` given `canExpendSlot` guard
- `machine.ts`: added `canExpendSlot` guard (`c.hp > 0 && !isIncapacitated(c)`)

## A2: END_TURN as modeling convention

**Assumption:** END_TURN is an explicit event in the state machine that transitions a creature from `acting` to `waitingForTurn`.

**Rules basis (PHB Ch. 9):** D&D 5e has no explicit "end turn" action. Turns proceed through initiative order implicitly. However, "at the end of your turn" is a pervasive trigger point in the rules (repeated saves for condition spells, ongoing damage, effect expiry). At the table, players universally say "I end my turn." The state machine needs a discrete transition to prevent START_TURN spam and to process end-of-turn triggers.

**Changes:** Implemented in TA2. `dnd.qnt`: added `turnPhase` state variable (`"outOfCombat"` | `"acting"` | `"waitingForTurn"`), `doEndTurn` action processing end-of-turn saves (remove effect + conditions on success), end-of-turn damage (with concentration checks), and clearing expired `AtEndOfTurn` effects. XState: `END_TURN` event on `acting` state transitions to `waitingForTurn`. MBT bridge maps `turnPhase` field-by-field.

## A3: Round = 6 seconds as atomic time unit

**Assumption:** The round (6 seconds) is the smallest time unit modeled. All durations are tracked as integer turn counts. No sub-round time tracking exists.

**Rules basis (PHB Ch. 9):** "A round represents about 6 seconds in the game world." Reactions, opportunity attacks, and reaction spells (Shield, Counterspell) are interrupt-style triggers within the round framework, not smaller time quanta. No spell or ability uses a duration shorter than 1 round. The phrase "until the end of this turn" (same-turn, sub-round duration) does not appear anywhere in the rules.

**Changes:** Not yet implemented. See PLAN_APPENDIX.md section 5.

## A4: Single-creature turn = 1 round for duration tracking

**Assumption:** In the single-creature model, each START_TURN/END_TURN cycle represents one round passing. Effect duration counters decrement by 1 per cycle regardless of when the effect was applied relative to initiative order.

**Rules basis:** This is a simplification. In multi-creature combat, a round is one full pass through the initiative order. An effect cast mid-round by another creature would technically expire at that creature's turn N rounds later, not at our turn. In a single-creature model we only observe our own turns, so each turn = 1 round is the only tractable approach. The caller is responsible for providing correct initial duration values accounting for initiative-order offset if needed.

**Changes:** Not yet implemented. See PLAN_APPENDIX.md section 5.
