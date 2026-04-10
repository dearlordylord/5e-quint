# MCP Event Surface Audit

## Status

Audit completed against the current worktree on 2026-04-09.

This is a read-only audit of MCP event surfaces. It does not propose raw event-count coverage as a completion metric, and it intentionally excludes transcript-port-to-dnd implementation.

## Purpose

We need to decide which core events should be exposed through MCP and how.

The wrong question is:

- "How many `DndEvent` / `BattleEvent` variants are exposed as `get_available_actions` tokens?"

The right question is:

- "For each core event, which MCP surface owns it?"

Some events are player options. Some are DM/session facts. Some are runtime resolution events. Some are internal trigger windows. Treating all of them as `get_available_actions` gaps would produce bad API design.

## Audit Sources

- [available-actions.md](./available-actions.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md) section 5
- [available-actions.ts](../packages/core/src/available-actions.ts)
- [machine-types.ts](../packages/core/src/machine-types.ts)
- [battle-machine-events.ts](../packages/core/src/battle-machine-events.ts)
- [server.ts](../packages/mcp/src/server.ts)

Current workspace counts from the audited files:

| Surface | Count |
| --- | ---: |
| Creature-scoped MCP action tokens | 43 |
| Battle-scoped MCP action tokens | 18 |
| Total current MCP action-token types | 61 |
| Creature core event variants | 112 |
| Battle core event variants | 42 |
| Total core event variants | 154 |

Raw event exposure is therefore 61 / 154 = about 40%. That number is not a completion metric. Many of the remaining 93 core variants should never appear in `get_available_actions`.

Current MCP tools are `get_state`, `get_available_actions`, `execute_action`, and `preview_action`. There is no separate session-control, DM-event, or descriptive-event MCP command yet.

## MCP Surface Taxonomy

Classify every core event into exactly one primary category:

| Category | Meaning | MCP shape |
| --- | --- | --- |
| `available_action` | A legal player/creature option that should be returned by `get_available_actions` and executable through `execute_action`. | Existing `ActionToken` / `ResolvedActionToken` path. |
| `direct_command` | A useful explicit MCP command that is not normally suggested as an option. | New command surface or a non-suggested resolved token. |
| `dm_or_descriptive_event` | A table fact, DM ruling, external damage/healing/effect, or transcript-derived event. | Future `record_table_event` / `apply_event` / `dm_event` surface, likely warning-aware. |
| `runtime_resolution` | A low-level event produced after an action token is chosen and runtime facts or dice are supplied. | Hidden behind `execute_action`; not directly advertised. |
| `internal_trigger` | A machine-owned trigger window or state-control event used to make later suggestions honest. | Not public except test/debug; may be emitted by domain/session code only if named semantically. |
| `setup_or_turn_control` | Battle/session lifecycle control such as battle init or turn advancement. | Likely explicit MCP command, not grouped as a player option unless UX wants it. |
| `internal_only` | Bookkeeping that should stay behind higher-level commands. | No public MCP surface. |

## Creature Event Classification

| Event | Scope | Currently exposed in MCP? | Current MCP token name | Classification | Reasoning | Should be in `get_available_actions`? | If not, owning MCP surface | Blocker or next implementation step |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `TAKE_DAMAGE` | creature | no | - | `dm_or_descriptive_event` | Damage is an external table fact, not a player option. | no | Future DM/descriptive event command. | Design warning-aware damage application surface. |
| `HEAL` | creature | no | - | `dm_or_descriptive_event` | Generic healing records a table outcome rather than a specific chosen feature. | no | Future DM/descriptive event command. | Design generic healing application surface. |
| `REDUCE_MAX_HP` | creature | no | - | `dm_or_descriptive_event` | Max-HP reduction comes from an external effect or rule fact. | no | Future DM/descriptive event command. | Add only after effect ownership is explicit. |
| `RESTORE_MAX_HP` | creature | no | - | `dm_or_descriptive_event` | Max-HP restoration is an external recovery fact. | no | Future DM/descriptive event command. | Add with max-HP reduction restoration semantics. |
| `GRANT_TEMP_HP` | creature | no | - | `dm_or_descriptive_event` | Generic temporary HP grants are produced by spells/features or DM facts. | no | Future DM/descriptive event command. | Add via semantic feature tokens or generic DM event. |
| `DEATH_SAVE` | creature | no | - | `runtime_resolution` | Death-save rolls are runtime dice consumed during turn processing. | no | Runtime/session roll owner. | Keep hidden behind turn processing or future roll owner. |
| `STABILIZE` | creature | no | - | `dm_or_descriptive_event` | Stabilization can be a DM/table result rather than an ordinary self option. | no | Future DM/descriptive event command. | Design table-event surface if manual stabilization is needed. |
| `KNOCK_OUT` | creature | no | - | `dm_or_descriptive_event` | Knockout is a damage-resolution choice or table outcome. | no | Future DM/descriptive event command. | Represent as part of damage/attack resolution, not an action token. |
| `APPLY_CONDITION` | creature | no | - | `dm_or_descriptive_event` | Condition application is an external rule/effect fact. | no | Future DM/descriptive event command. | Add warning-aware condition application if needed. |
| `REMOVE_CONDITION` | creature | no | - | `dm_or_descriptive_event` | Generic condition removal is an external rule/effect fact. | no | Future DM/descriptive event command. | Add via semantic feature/spell or generic DM event. |
| `ADD_EXHAUSTION` | creature | no | - | `dm_or_descriptive_event` | Exhaustion gain is an external environmental or rule fact. | no | Future DM/descriptive event command. | Add only with table-event provenance. |
| `REDUCE_EXHAUSTION` | creature | no | - | `dm_or_descriptive_event` | Exhaustion reduction is an external recovery or rest fact. | no | Future DM/descriptive event command. | Prefer rest semantics when possible. |
| `START_TURN` | creature | yes | `START_TURN` | `setup_or_turn_control` | This starts creature turn processing and currently exposes a runtime-filled token. | yes | - | Existing token is acceptable; longer term, session control may own it. |
| `END_TURN` | creature | no | - | `setup_or_turn_control` | Ending a turn is lifecycle control rather than a character option. | no | Future session-control command. | Add when MCP can drive full turn flow explicitly. |
| `USE_ACTION` | creature | no | - | `internal_only` | This is raw action-economy bookkeeping behind semantic actions. | no | None. | Keep internal. |
| `USE_BONUS_ACTION` | creature | no | - | `internal_only` | This is raw bonus-action bookkeeping behind semantic actions. | no | None. | Keep internal. |
| `USE_REACTION` | creature | no | - | `internal_only` | This is raw reaction-economy bookkeeping behind semantic reactions. | no | None. | Keep internal. |
| `USE_MOVEMENT` | creature | no | - | `internal_only` | Creature-level movement spending is low-level economy accounting. | no | None. | Use battle/session movement surfaces instead. |
| `USE_EXTRA_ATTACK` | creature | no | - | `internal_only` | Extra-attack spending is bookkeeping inside attack resolution. | no | None. | Keep internal. |
| `STAND_FROM_PRONE` | creature | no | - | `available_action` | Standing from prone is a real movement option, but the current public token is battle-scoped. | yes | Existing battle `get_available_actions`; creature direct action only if single-creature UX needs it. | Creature-scope token is blocked on deciding whether single-creature movement remains public. |
| `DROP_PRONE` | creature | no | - | `dm_or_descriptive_event` | Dropping prone is table-position state and should be owned with movement/position semantics. | no | Future DM/descriptive or movement command. | Needs session/position ownership before public exposure. |
| `MARK_BONUS_ACTION_SPELL` | creature | no | - | `internal_only` | This records spellcasting restrictions after a spell action. | no | None. | Keep behind spell execution. |
| `MARK_NON_CANTRIP_ACTION_SPELL` | creature | no | - | `internal_only` | This records spellcasting restrictions after a spell action. | no | None. | Keep behind spell execution. |
| `CAST_PREPARED_SPELL` | creature | yes | `CAST_PREPARED_SPELL` | `available_action` | It is a legal player spell option with user-filled spell and slot choices. | yes | - | Existing token is the correct owner. |
| `GRAPPLE` | creature | no | - | `available_action` | Grapple is a player attack option, but target and contest facts are battle-owned. | yes | Battle `get_available_actions`. | Blocked on battle target/size/free-hand/save-result ownership for honest token projection. |
| `SET_GRAPPLING_STATE` | creature | no | - | `internal_only` | This is a state repair/projection helper, not a player command. | no | None. | Keep internal. |
| `RELEASE_GRAPPLE` | creature | no | - | `available_action` | Releasing a grapple is a real option, but current ownership belongs in battle state. | yes | Battle `get_available_actions`. | Blocked on battle grapple ownership and target identity projection. |
| `ESCAPE_GRAPPLE` | creature | no | - | `available_action` | Escaping a grapple is a real option with runtime contest result. | yes | Battle `get_available_actions`. | Blocked on battle grapple ownership and escape check/result ownership. |
| `SHOVE` | creature | no | - | `available_action` | Shove is a player attack option, but target, size, and save facts are battle-owned. | yes | Battle `get_available_actions`. | Blocked on battle target/size/save-result ownership and choice projection. |
| `GRANT_EXTRA_ACTION` | creature | no | - | `internal_only` | Extra action grants are internal results of features such as Action Surge. | no | None. | Keep behind semantic feature events. |
| `EXPEND_PACT_SLOT` | creature | no | - | `internal_only` | Pact slot spending is bookkeeping under spell/feature actions. | no | None. | Keep behind semantic spell/feature tokens. |
| `EXPEND_SLOT` | creature | no | - | `internal_only` | Spell slot spending is bookkeeping under spell/feature actions. | no | None. | Keep behind semantic spell/feature tokens. |
| `START_CONCENTRATION` | creature | no | - | `internal_only` | Concentration start is an effect of spell execution. | no | None. | Keep behind spell execution. |
| `ADD_EFFECT` | creature | no | - | `dm_or_descriptive_event` | Generic effect insertion is a table/effect fact, not a player option. | no | Future DM/descriptive event command. | Add only with provenance and warning semantics. |
| `REMOVE_EFFECT` | creature | no | - | `dm_or_descriptive_event` | Generic effect removal is a table/effect fact. | no | Future DM/descriptive event command. | Add only with provenance and warning semantics. |
| `BREAK_CONCENTRATION` | creature | no | - | `dm_or_descriptive_event` | Concentration break is normally caused by damage, incapacitation, or table choice. | no | Future DM/descriptive event command. | Prefer generated break from owned damage/condition semantics. |
| `CONCENTRATION_CHECK` | creature | no | - | `runtime_resolution` | This is a runtime save result after damage or another concentration trigger. | no | Runtime/session roll owner. | Keep behind damage/concentration resolution. |
| `SHORT_REST` | creature | yes | `SHORT_REST` | `setup_or_turn_control` | Resting is lifecycle control with user-selected hit dice and runtime rolls. | yes | - | Existing token is acceptable; session-control split can revisit. |
| `LONG_REST` | creature | no | - | `setup_or_turn_control` | Long rest is lifecycle/session control rather than an in-turn option. | no | Future session-control command. | Add explicit rest command if MCP should drive rest flow. |
| `SPEND_HIT_DIE` | creature | no | - | `internal_only` | Hit-die spending is a sub-step of `SHORT_REST`. | no | None. | Keep behind `SHORT_REST`. |
| `APPLY_FALL` | creature | no | - | `dm_or_descriptive_event` | Falling is an environmental/table event with runtime damage. | no | Future DM/descriptive event command. | Add after environmental event shape is designed. |
| `SUFFOCATE` | creature | no | - | `dm_or_descriptive_event` | Suffocation is an environmental/table event. | no | Future DM/descriptive event command. | Add after environmental event shape is designed. |
| `APPLY_STARVATION` | creature | no | - | `dm_or_descriptive_event` | Starvation is an environmental/table event. | no | Future DM/descriptive event command. | Add after environmental event shape is designed. |
| `APPLY_DEHYDRATION` | creature | no | - | `dm_or_descriptive_event` | Dehydration is an environmental/table event. | no | Future DM/descriptive event command. | Add after environmental event shape is designed. |
| `USE_BONUS_MOVEMENT` | creature | no | - | `internal_only` | Bonus movement spending is economy bookkeeping. | no | None. | Keep behind movement-granting actions. |
| `ENTER_COMBAT` | creature | yes | `ENTER_COMBAT` | `setup_or_turn_control` | Entering combat changes lifecycle mode rather than spending an action. | yes | - | Existing token is acceptable for single-creature host bootstrap. |
| `EXIT_COMBAT` | creature | yes | `EXIT_COMBAT` | `setup_or_turn_control` | Exiting combat changes lifecycle mode rather than spending an action. | yes | - | Existing token is acceptable for single-creature host teardown. |
| `USE_SECOND_WIND` | creature | yes | `USE_SECOND_WIND` | `available_action` | It is a legal player feature option with MCP-owned runtime healing die. | yes | - | Existing token is the correct owner; future roll owner should replace random sampling. |
| `USE_ACTION_SURGE` | creature | yes | `USE_ACTION_SURGE` | `available_action` | It is a legal player feature option that grants action economy. | yes | - | Existing token is the correct creature-scope owner. |
| `USE_INDOMITABLE` | creature | yes | `USE_INDOMITABLE` | `available_action` | It is a legal player reaction to an owned pending saving-throw failure. | yes | - | Existing token is the correct owner. |
| `TRIGGER_INDOMITABLE` | creature | no | - | `internal_trigger` | This establishes the pending Indomitable window. | no | Domain/session trigger owner, not public raw event. | Keep internal; expose only a semantic failed-save record if needed. |
| `USE_TACTICAL_MIND` | creature | yes | `USE_TACTICAL_MIND` | `available_action` | It is a legal player feature option over an owned pending failed ability check. | yes | - | Existing token is the correct owner; future roll owner should replace random success sampling. |
| `TRIGGER_TACTICAL_MIND` | creature | no | - | `internal_trigger` | This establishes the pending Tactical Mind window. | no | Domain/session trigger owner, not public raw event. | Keep internal; expose only a semantic failed-check record if needed. |
| `USE_HEROIC_INSPIRATION` | creature | yes | `USE_HEROIC_INSPIRATION` | `available_action` | It is a legal player option to spend Heroic Inspiration. | yes | - | Existing token is the correct owner. |
| `SCORE_CRITICAL_HIT` | creature | no | - | `runtime_resolution` | Critical-hit scoring is an attack-resolution result, not an independent command. | no | Runtime attack resolution. | Keep behind attack resolution. |
| `USE_LEGENDARY_ACTION` | creature | no | - | `direct_command` | Named monster legendary actions are explicit monster/session commands, not ordinary PC suggestions. | no | Future monster/session command. | Needs action-name legality and monster stat-block ownership. |
| `USE_RECHARGE_ABILITY` | creature | no | - | `direct_command` | Named recharge abilities are explicit monster/session commands. | no | Future monster/session command. | Needs stat-block ability ownership and recharge state projection. |
| `USE_DAILY_ABILITY` | creature | no | - | `direct_command` | Named daily abilities are explicit monster/session commands. | no | Future monster/session command. | Needs stat-block ability ownership and daily-use projection. |
| `ENTER_RAGE` | creature | yes | `ENTER_RAGE` | `available_action` | It is a legal player bonus-action feature option. | yes | - | Existing token is the correct creature-scope owner. |
| `END_RAGE` | creature | yes | `END_RAGE` | `available_action` | It is a legal player choice to end Rage. | yes | - | Existing token is the correct owner. |
| `EXTEND_RAGE_BA` | creature | yes | `EXTEND_RAGE_BA` | `available_action` | It is a legal player bonus-action feature option. | yes | - | Existing token is the correct owner. |
| `MARK_ATTACK_OR_FORCED_SAVE` | creature | no | - | `internal_only` | This is Rage-duration bookkeeping after an attack or forced save. | no | None. | Keep behind attack/save-producing actions. |
| `DECLARE_RECKLESS` | creature | yes | `DECLARE_RECKLESS` | `available_action` | It is a legal player declaration for Reckless Attack. | yes | - | Existing token is the correct creature-scope owner. |
| `USE_INTIMIDATING_PRESENCE` | creature | no | - | `available_action` | It is a real Barbarian feature option, but target/save facts are not in the current token. | yes | Battle `get_available_actions` or creature token with explicit target hole. | Blocked on target and save-result ownership. |
| `RESTORE_INTIMIDATING_PRESENCE` | creature | no | - | `dm_or_descriptive_event` | This restores a feature use and is not an in-turn player action. | no | Future rest/session or DM event surface. | Prefer rest/session ownership. |
| `USE_BRUTAL_STRIKE` | creature | no | - | `available_action` | It is a Barbarian attack rider that needs attack-context ownership. | yes | Battle `get_available_actions`. | Blocked on battle attack/rider choice ownership. |
| `USE_RELENTLESS_RAGE` | creature | yes | `USE_RELENTLESS_RAGE` | `available_action` | It is a legal feature option over an owned pending drop-to-zero window. | yes | - | Existing token is the correct owner; future roll owner should replace random save sampling. |
| `USE_LAY_ON_HANDS` | creature | yes | `USE_LAY_ON_HANDS` | `available_action` | It is a legal player feature option with a user-filled amount. | yes | - | Existing token is the correct owner. |
| `USE_PALADIN_CHANNEL_DIVINITY` | creature | yes | `USE_PALADIN_CHANNEL_DIVINITY` | `available_action` | It is a legal player resource use in the current feature model. | yes | - | Existing token is the correct owner. |
| `USE_DIVINE_SMITE` | creature | yes | `USE_DIVINE_SMITE` | `available_action` | It is a legal player smite option with a user-filled slot level. | yes | - | Existing token is the correct owner. |
| `USE_DIVINE_SMITE_FREE` | creature | no | - | `available_action` | It is a modeled Paladin feature option not currently in the MCP registry. | yes | Creature or battle `get_available_actions`. | Add token only after verifying current guard semantics and RAW trigger ownership. |
| `FLURRY_OF_BLOWS` | creature | yes | `FLURRY_OF_BLOWS` | `available_action` | It is a legal player Monk bonus-action option. | yes | - | Existing token is the correct owner. |
| `PATIENT_DEFENSE_FREE` | creature | yes | `PATIENT_DEFENSE_FREE` | `available_action` | It is a legal player Monk option. | yes | - | Existing token is the correct owner. |
| `PATIENT_DEFENSE_FOCUS` | creature | yes | `PATIENT_DEFENSE_FOCUS` | `available_action` | It is a legal player Monk option with Focus cost. | yes | - | Existing token is the correct owner. |
| `STEP_OF_THE_WIND_FREE` | creature | yes | `STEP_OF_THE_WIND_FREE` | `available_action` | It is a legal player Monk option. | yes | - | Existing token is the correct owner. |
| `STEP_OF_THE_WIND_FOCUS` | creature | yes | `STEP_OF_THE_WIND_FOCUS` | `available_action` | It is a legal player Monk option with Focus cost. | yes | - | Existing token is the correct owner. |
| `STUNNING_STRIKE` | creature | no | - | `available_action` | It is a Monk attack rider that needs hit/save/target ownership. | yes | Battle `get_available_actions`. | Blocked on battle attack rider and save-result ownership. |
| `WHOLENESS_OF_BODY` | creature | yes | `WHOLENESS_OF_BODY` | `available_action` | It is a legal player Monk option with runtime heal roll. | yes | - | Existing token is the correct owner; future roll owner should replace random sampling. |
| `UNCANNY_METABOLISM` | creature | yes | `UNCANNY_METABOLISM` | `available_action` | It is a legal player Monk option with runtime heal roll. | yes | - | Existing token is the correct owner; future roll owner should replace random sampling. |
| `USE_ARCANE_RECOVERY` | creature | yes | `USE_ARCANE_RECOVERY` | `available_action` | It is a legal player Wizard option with a user-filled slot level. | yes | - | Existing token is the correct owner. |
| `USE_OVERCHANNEL` | creature | yes | `USE_OVERCHANNEL` | `available_action` | It is a legal player option over an owned pending Overchannel window. | yes | - | Existing token is the correct owner. |
| `TRIGGER_OVERCHANNEL` | creature | no | - | `internal_trigger` | This establishes the pending Overchannel window. | no | Domain/session trigger owner, not public raw event. | Keep internal; expose only semantic spell-damage trigger if needed. |
| `USE_SNEAK_ATTACK` | creature | yes | `USE_SNEAK_ATTACK` | `available_action` | It is a legal player option over an owned pending Sneak Attack window. | yes | - | Existing token is the correct owner. |
| `TRIGGER_SNEAK_ATTACK` | creature | no | - | `internal_trigger` | This establishes the pending Sneak Attack window. | no | Domain/session trigger owner, not public raw event. | Keep internal; expose only semantic attack-hit trigger if needed. |
| `USE_STEADY_AIM` | creature | yes | `USE_STEADY_AIM` | `available_action` | It is a legal player Rogue bonus-action option. | yes | - | Existing token is the correct owner. |
| `CUNNING_ACTION_DASH` | creature | yes | `CUNNING_ACTION_DASH` | `available_action` | It is a legal player Rogue bonus-action option. | yes | - | Existing token is the correct owner. |
| `CUNNING_ACTION_DISENGAGE` | creature | yes | `CUNNING_ACTION_DISENGAGE` | `available_action` | It is a legal player Rogue bonus-action option. | yes | - | Existing token is the correct owner. |
| `CUNNING_ACTION_HIDE` | creature | yes | `CUNNING_ACTION_HIDE` | `available_action` | It is a legal player Rogue bonus-action option. | yes | - | Existing token is the correct owner. |
| `USE_UNCANNY_DODGE` | creature | no | - | `available_action` | It is a real reaction, but the current public owner is battle interrupt state. | yes | Existing battle `get_available_actions`. | Creature-scope token should remain deferred in favor of battle reaction token. |
| `USE_CUNNING_STRIKE` | creature | no | - | `available_action` | It is a Rogue attack rider that needs attack-hit and rider-choice ownership. | yes | Battle `get_available_actions`. | Blocked on battle attack rider choice ownership. |
| `USE_CLERIC_CHANNEL_DIVINITY` | creature | yes | `USE_CLERIC_CHANNEL_DIVINITY` | `available_action` | It is a legal player Cleric resource use in the current feature model. | yes | - | Existing token is the correct owner. |
| `USE_MAGICAL_CUNNING` | creature | no | - | `available_action` | It is a real Warlock recovery feature not currently in the MCP registry. | yes | Creature `get_available_actions`. | High-confidence candidate after RAW/guard review. |
| `USE_MYSTIC_ARCANUM` | creature | yes | `USE_MYSTIC_ARCANUM` | `available_action` | It is a legal player Warlock option with a user-filled spell level. | yes | - | Existing token is the correct owner. |
| `USE_ELDRITCH_SMITE` | creature | no | - | `available_action` | It is a Warlock attack rider that needs hit/target/prone ownership. | yes | Battle `get_available_actions`. | Blocked on battle attack rider and target-state ownership. |
| `CONVERT_SLOT_TO_POINTS` | creature | yes | `CONVERT_SLOT_TO_POINTS` | `available_action` | It is a legal player Sorcerer option with a user-filled slot level. | yes | - | Existing token is the correct owner. |
| `CONVERT_POINTS_TO_SLOT` | creature | yes | `CONVERT_POINTS_TO_SLOT` | `available_action` | It is a legal player Sorcerer option with a user-filled slot level. | yes | - | Existing token is the correct owner. |
| `USE_INNATE_SORCERY` | creature | no | - | `available_action` | It is a real Sorcerer feature not currently in the MCP registry. | yes | Creature `get_available_actions`. | High-confidence candidate after RAW/guard review. |
| `USE_METAMAGIC` | creature | yes | `USE_METAMAGIC` | `available_action` | It is a legal player Sorcerer option with known-option filtering. | yes | - | Existing token is the correct owner. |
| `USE_FREE_HUNTERS_MARK` | creature | no | - | `available_action` | It is a Ranger spell/feature option that needs target/spell ownership. | yes | Creature or battle `get_available_actions`. | Blocked on Hunter's Mark target and spell-effect ownership. |
| `USE_TIRELESS` | creature | yes | `USE_TIRELESS` | `available_action` | It is a legal player Ranger option with runtime temp-HP die. | yes | - | Existing token is the correct owner; future roll owner should replace random sampling. |
| `USE_NATURES_VEIL` | creature | yes | `USE_NATURES_VEIL` | `available_action` | It is a legal player Ranger bonus-action option. | yes | - | Existing token is the correct owner. |
| `USE_BARDIC_INSPIRATION` | creature | yes | `USE_BARDIC_INSPIRATION` | `available_action` | It is a legal player Bard resource option in the current feature model. | yes | - | Existing token is the correct owner. |
| `USE_CUTTING_WORDS` | creature | no | - | `available_action` | It is a real reaction, but the current public owner is battle interrupt state. | yes | Existing battle `get_available_actions`. | Creature-scope token should remain deferred in favor of battle reaction token. |
| `USE_FONT_SLOT_RESTORE` | creature | yes | `USE_FONT_SLOT_RESTORE` | `available_action` | It is a legal player Bard option with a user-filled slot level. | yes | - | Existing token is the correct owner. |
| `USE_PEERLESS_SKILL` | creature | yes | `USE_PEERLESS_SKILL` | `available_action` | It is a legal player option over an owned pending failed roll. | yes | - | Existing token is the correct owner; future roll owner should replace random success sampling. |
| `TRIGGER_PEERLESS_SKILL_ABILITY_CHECK` | creature | no | - | `internal_trigger` | This establishes the pending Peerless Skill ability-check window. | no | Domain/session trigger owner, not public raw event. | Keep internal; expose only semantic failed-check record if needed. |
| `TRIGGER_PEERLESS_SKILL_ATTACK_ROLL` | creature | no | - | `internal_trigger` | This establishes the pending Peerless Skill attack-roll window. | no | Domain/session trigger owner, not public raw event. | Keep internal; expose only semantic failed-attack record if needed. |
| `ENTER_WILD_SHAPE` | creature | no | - | `available_action` | It is a real Druid feature option not currently in the MCP registry. | yes | Creature `get_available_actions`. | High-confidence candidate after RAW/guard review and token shape check. |
| `EXIT_WILD_SHAPE` | creature | no | - | `available_action` | It is a real Druid feature option not currently in the MCP registry. | yes | Creature `get_available_actions`. | High-confidence candidate after RAW/guard review and token shape check. |
| `USE_WILD_RESURGENCE_CHARGE` | creature | yes | `USE_WILD_RESURGENCE_CHARGE` | `available_action` | It is a legal player Druid option with a user-filled slot level. | yes | - | Existing token is the correct owner. |
| `USE_WILD_RESURGENCE_SLOT` | creature | no | - | `available_action` | It is a real Druid feature option not currently in the MCP registry. | yes | Creature `get_available_actions`. | High-confidence candidate after RAW/guard review and token shape check. |
| `CLEAR_PENDING_RESOLUTION` | creature | no | - | `internal_only` | This clears internal pending-resolution bookkeeping. | no | None. | Keep internal. |

## Battle Event Classification

| Event | Scope | Currently exposed in MCP? | Current MCP token name | Classification | Reasoning | Should be in `get_available_actions`? | If not, owning MCP surface | Blocker or next implementation step |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `BATTLE_INIT` | battle | no | - | `setup_or_turn_control` | Battle initialization is session lifecycle control. | no | Future session-control command. | Add explicit battle/session setup command if MCP should create battles. |
| `BATTLE_START_TURN` | battle | no | - | `setup_or_turn_control` | Starting a battle turn is lifecycle control with runtime start-of-turn facts. | no | Future session-control command. | Add after turn-start runtime fact ownership is explicit. |
| `BATTLE_ATTACK` | battle | no | - | `available_action` | Attack is a primary player option, but the event needs target, weapon, roll, damage, visibility, and reaction-candidate facts. | yes | Battle `get_available_actions`. | Blocked on battle/session ownership of target, weapon payload, roll/damage, visibility, and reaction-candidate facts. |
| `BATTLE_HELP_ATTACK` | battle | no | - | `available_action` | Help attack is a player action needing ally, target, visibility, and range facts. | yes | Battle `get_available_actions`. | Blocked on ally/target and spatial visibility ownership. |
| `BATTLE_RESOLVE_HIT_REACTION` | battle | yes | `CAST_SHIELD` / `USE_PARRY` / `USE_CUTTING_WORDS` | `runtime_resolution` | This is the low-level hit-reaction decision emitted after a reaction token is chosen. | no | Hidden behind `execute_action`. | Existing token wrappers are correct; do not expose raw event. |
| `BATTLE_RESOLVE_DMG_REACTION` | battle | yes | `USE_UNCANNY_DODGE` / `USE_DEFLECT_ATTACKS` | `runtime_resolution` | This is the low-level damage-reaction decision emitted after a reaction token is chosen. | no | Hidden behind `execute_action`. | Existing token wrappers are correct; do not expose raw event. |
| `BATTLE_AFTER_DAMAGE_DECLINE` | battle | no | - | `runtime_resolution` | Declining after-damage reactions is a low-level branch in the interrupt window. | no | Hidden behind `execute_action` or future explicit decline command. | Add only if reaction-window UX needs a public decline token. |
| `BATTLE_AFTER_DAMAGE_SPELL_REACTION` | battle | yes | `CAST_HELLISH_REBUKE` | `runtime_resolution` | This is the low-level spell reaction emitted after Hellish Rebuke is chosen and runtime facts are supplied. | no | Hidden behind `execute_action`. | Existing token wrapper is correct; future roll owner should replace random damage/save sampling. |
| `BATTLE_AFTER_DAMAGE_REACTIVE_EFFECT` | battle | yes | `TRIGGER_FIRE_SHIELD` | `runtime_resolution` | This applies an automatic/reactive effect payload after damage. | no | Hidden behind `execute_action`. | Existing token wrapper is acceptable, but token naming may later become less trigger-like. |
| `BATTLE_AFTER_DAMAGE_RETALIATION` | battle | yes | `USE_RETALIATION` | `runtime_resolution` | This is the low-level retaliation attack emitted after the reaction token is chosen. | no | Hidden behind `execute_action`. | Existing token wrapper is correct; future attack roll owner should replace random sampling. |
| `BATTLE_CAST_SAVE_SPELL` | battle | no | - | `dm_or_descriptive_event` | Generic save-spell casting needs spell payload, target, save, and damage facts not projected as a public action token. | no | Future spell/direct or DM event surface. | Prefer modeled spell tokens with battle-owned spell payloads before generic raw event exposure. |
| `BATTLE_RESOLVE_COUNTERSPELL` | battle | yes | `CAST_COUNTERSPELL` | `runtime_resolution` | This is the low-level Counterspell decision emitted after a reaction token is chosen. | no | Hidden behind `execute_action`. | Existing token wrapper is correct; future roll owner should replace random ability-check sampling. |
| `BATTLE_RESOLVE_SAVE_FAILED_REACTION` | battle | no | - | `runtime_resolution` | This resolves save-failed reaction choices such as Legendary Resistance. | no | Hidden behind future reaction token/direct monster command. | Add semantic Legendary Resistance token/command if MCP should operate monsters. |
| `BATTLE_CAST_CONCENTRATION_SPELL` | battle | no | - | `dm_or_descriptive_event` | Generic concentration-spell casting needs spell and target facts not projected as a public action token. | no | Future spell/direct or DM event surface. | Prefer modeled spell tokens with battle-owned payloads before generic raw event exposure. |
| `BATTLE_CONCENTRATION_CHECK` | battle | no | - | `runtime_resolution` | This resolves a concentration save for a target after a trigger. | no | Runtime/session roll owner. | Keep behind damage/concentration resolution. |
| `BATTLE_CAST_AOE` | battle | no | - | `dm_or_descriptive_event` | AoE casting starts a spell resolution with spell payload and target iteration facts. | no | Future spell/direct or DM event surface. | Prefer modeled AoE spell token and area/target ownership first. |
| `BATTLE_RESOLVE_AOE_TARGET` | battle | no | - | `runtime_resolution` | This is per-target AoE save resolution. | no | Hidden behind AoE spell execution. | Keep behind future AoE token/runtime owner. |
| `BATTLE_MOVE` | battle | no | - | `available_action` | Movement is a player option, but provocation and threatened-creature facts are session/spatial ownership. | yes | Battle `get_available_actions`. | Blocked on session/geometry ownership of path, threats, and opportunity-attack provocation. |
| `BATTLE_MOVEMENT_OA_DECLINE` | battle | no | - | `runtime_resolution` | This is an opportunity-attack reaction-window decline branch. | no | Hidden behind movement reaction handling. | Add only if movement OA UX needs a public decline token. |
| `BATTLE_MOVEMENT_OA_ATTACK` | battle | no | - | `runtime_resolution` | This is the low-level opportunity attack emitted after a movement reaction is chosen. | no | Hidden behind future OA reaction token. | Blocked on OA reaction token and attack runtime fact ownership. |
| `BATTLE_END_TURN` | battle | no | - | `setup_or_turn_control` | Ending a battle turn is lifecycle control with runtime end-of-turn facts. | no | Future session-control command. | Add after end-turn runtime fact ownership is explicit. |
| `BATTLE_LEGENDARY_PASS` | battle | no | - | `setup_or_turn_control` | Passing a legendary-action window is turn-control for monsters. | no | Future session/monster-control command. | Add with legendary-action window surface if MCP should operate monsters. |
| `BATTLE_LEGENDARY_ATTACK` | battle | no | - | `available_action` | A legendary attack is a monster option but needs target, roll, damage, and reaction-candidate facts. | yes | Battle `get_available_actions` for monster hosts or monster-control command. | Blocked on monster action payload and runtime attack ownership. |
| `BATTLE_HEAL` | battle | no | - | `dm_or_descriptive_event` | Generic battle healing records a table/spell outcome rather than a specific player token. | no | Future DM/descriptive or modeled spell token surface. | Prefer semantic spell/feature tokens before generic raw event exposure. |
| `BATTLE_DASH` | battle | yes | `BATTLE_DASH` | `available_action` | It is a legal active-turn player action. | yes | - | Existing token is the correct owner. |
| `BATTLE_DISENGAGE` | battle | yes | `BATTLE_DISENGAGE` | `available_action` | It is a legal active-turn player action. | yes | - | Existing token is the correct owner. |
| `BATTLE_DODGE` | battle | yes | `BATTLE_DODGE` | `available_action` | It is a legal active-turn player action. | yes | - | Existing token is the correct owner. |
| `BATTLE_HIDE` | battle | no | - | `available_action` | Hide is a player action, but it needs stealth, cover/obscurement, and line-of-sight facts. | yes | Battle `get_available_actions`. | Blocked on stealth roll and hiding precondition ownership. |
| `BATTLE_SEARCH` | battle | no | - | `available_action` | Search is a player action, but it needs target and perception-result facts. | yes | Battle `get_available_actions`. | Blocked on target choice and perception roll ownership. |
| `BATTLE_STAND_FROM_PRONE` | battle | yes | `STAND_FROM_PRONE` | `available_action` | Standing from prone is a legal movement option projected with battle movement cost. | yes | - | Existing token is the correct owner. |
| `BATTLE_OFF_HAND_ATTACK` | battle | no | - | `available_action` | Off-hand attack is a player bonus-action option but needs target, weapon, roll, damage, and visibility facts. | yes | Battle `get_available_actions`. | Blocked on battle weapon/target/roll/damage fact ownership. |
| `BATTLE_GRAPPLE` | battle | no | - | `available_action` | Grapple is a player attack option but needs target, size, and save/contest facts. | yes | Battle `get_available_actions`. | Blocked on target/size/free-hand and contest-result ownership. |
| `BATTLE_RELEASE_GRAPPLE` | battle | no | - | `available_action` | Releasing a grapple is a player option when battle state owns an active grapple. | yes | Battle `get_available_actions`. | Blocked on target-specific grapple ownership projection. |
| `BATTLE_ESCAPE_GRAPPLE` | battle | no | - | `available_action` | Escaping a grapple is a player option with runtime contest result. | yes | Battle `get_available_actions`. | Blocked on grappled-by ownership and escape-result ownership. |
| `BATTLE_ACTION_SURGE` | battle | no | - | `available_action` | Action Surge is a legal battle-scoped player feature option. | yes | Battle `get_available_actions`. | High-confidence candidate after RAW/guard review because battle state already owns fighter level and charges. |
| `BATTLE_ENTER_RAGE` | battle | no | - | `available_action` | Entering Rage is a legal battle-scoped player feature option. | yes | Battle `get_available_actions`. | High-confidence candidate after RAW/guard review because battle state already owns Barbarian state. |
| `BATTLE_DECLARE_RECKLESS` | battle | no | - | `available_action` | Reckless Attack declaration is a legal battle-scoped player feature option. | yes | Battle `get_available_actions`. | High-confidence candidate after RAW/guard review because battle state already tracks reckless state and turn. |
| `BATTLE_READY` | battle | yes | `BATTLE_READY` | `available_action` | Ready is a legal active-turn player action. | yes | - | Existing token is the correct owner. |
| `BATTLE_READY_SPELL` | battle | yes | `BATTLE_READY_SPELL` | `available_action` | Ready spell is a legal active-turn option with battle-owned spell payloads and user-filled choices. | yes | - | Existing token is the correct owner. |
| `BATTLE_READY_PASS` | battle | yes | `BATTLE_READY_PASS` | `runtime_resolution` | Passing a ready trigger is a trigger-window branch rather than a normal active-turn action. | yes | - | Existing token is acceptable for the ready window; do not expose raw lifecycle commands beyond this. |
| `BATTLE_READY_RELEASE` | battle | yes | `BATTLE_READY_RELEASE` | `available_action` | Releasing a readied attack is a legal reaction option in the ready window. | yes | - | Existing token is the correct owner; future attack roll owner should replace random sampling. |
| `BATTLE_READY_SPELL_RELEASE` | battle | yes | `BATTLE_READY_SPELL_RELEASE` | `available_action` | Releasing a readied spell is a legal reaction option in the ready window. | yes | - | Existing token is the correct owner; future save roll owner should replace random sampling. |

## Recommended Next MCP Batch

Smallest high-confidence implementation batch after this audit:

1. Add battle active-turn feature tokens for `BATTLE_ACTION_SURGE`, `BATTLE_ENTER_RAGE`, and `BATTLE_DECLARE_RECKLESS`.
2. Keep the batch battle-only and do not add target/roll/spatial actions yet.
3. Before implementation, read the relevant SRD 5.2.1 passages in `.references/srd-5.2.1/` and check [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) for terminology.
4. Verify each token is projected from existing battle-owned facts only: active creature, turn started, action/bonus-action economy, class level, feature charges, Rage state, and Reckless state.
5. Add focused available-actions and MCP tests for the three tokens; run the cheapest relevant non-MBT tests first, then Tier 1 battle MBT only after code changes are complete.

Why this batch is small and high-confidence:

- The battle machine already has raw events and action handlers for all three events.
- The events do not require target choice, geometry, attack roll, damage roll, line of sight, or reaction-candidate ownership.
- The batch avoids MCP-only booleans and avoids adding any internal bookkeeping event to `get_available_actions`.

Explicitly deferred:

- `BATTLE_ATTACK`, `BATTLE_OFF_HAND_ATTACK`, `BATTLE_GRAPPLE`, `BATTLE_ESCAPE_GRAPPLE`, `BATTLE_MOVE`, `BATTLE_HIDE`, `BATTLE_SEARCH`, `BATTLE_HELP_ATTACK`, and `BATTLE_LEGENDARY_ATTACK` because they need missing target/spatial/roll/payload ownership facts.
- Generic damage, healing, conditions, effects, environmental events, and raw spell events because they belong to a future DM/descriptive event surface, not `get_available_actions`.
- Internal triggers and bookkeeping events because they should remain domain-owned and hidden behind semantic commands.
