# PBA2 Named-Ability Drift Audit

Date: 2026-04-30

Scope: `@dnd/battle-runtime`, promoted MCP battle composition, and the Surface
Unit/Stat Block readers used by battle.

## Finding

One harmful named-ability support-gate drift was found. PBA3 should correct the
Action Surge admission path before PBA4 unblocks: discovery currently admits the
Unit feature by `fighter_action_surge` id alone, while resolution later parses a
partial activation-mechanics shape and reads the first phase/effect position.
That split can admit a widened authored Unit that resolution rejects late, or
silently ignore additional meaningful mechanics.

The reducer currently distinguishes dispatch identity from authored data
identity:

- Dispatch identity is the `BattleSubject` tag family: `action.attack`,
  `actionSpell`, `unitFeature`, and `runtimeCommand.endTurn`.
- Authored data identity remains in retained Surface records: weapon names,
  Stat Block attack names, Spell Record ids, Unit ids, and Stat Block ids.
- Support gates may use names where the current promoted slice intentionally
  admits one authored feature or spell shape, but the admitted mechanics shape
  must be parsed once and shared by discovery and resolution.

## Classification

| Reference                                      | Location                                                       | Classification                                                     | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attack subject `attackName`                    | `packages/battle-runtime/src/index.ts:844-849`, `:2800-2809`   | Acceptable authored identity                                       | The name disambiguates retained weapon or Stat Block attack data during replay. The Attack reducer still dispatches on `action.attack` and derives reach/range, attack bonus, damage, and riders from the selected option.                                                                                                                                                                                                         |
| Stat Block named attacks                       | `packages/battle-runtime/src/index.ts:2821-2855`, `:2857-2945` | Acceptable reader/support gate                                     | No Goblin, Skeleton, Scimitar, Shortbow, or Shortsword branch exists in the reducer. Generic attack-shape readers admit literal attack bonus, one base damage effect, optional advantage bonus damage, and melee or normal ranged targeting.                                                                                                                                                                                       |
| Stat Block damage modifiers                    | `packages/battle-runtime/src/index.ts:2253-2281`               | Acceptable data-derived runtime projection                         | Immunity, resistance, and vulnerability are read from retained `StatBlockRecord` at the HP mutation boundary. There is no Skeleton-specific reducer dispatch.                                                                                                                                                                                                                                                                      |
| Action Surge Unit id `fighter_action_surge`    | `packages/battle-runtime/src/index.ts:765`, `:1718-1842`       | Should be centralized in one reader/support parser                 | The Unit id is acceptable authored identity for the first admitted Unit feature, but the current support gate is split: discovery checks only the id, while resolution checks a partial activation mechanics shape through `actionSurgeRestriction`. The parser also relies on `mechanics.phases[0]` and `phase.effects?.[0]` without enforcing cardinality, so the executable assumption is not shared at the admission boundary. |
| `unitFeature` subject `unitId`                 | `packages/battle-runtime/src/index.ts:1733-1739`, `:1759-1807` | Acceptable dispatch key plus authored identity                     | The subject carries the retained Unit id so replay can find the selected resource. It does not create one reducer branch per Unit; unsupported Units are rejected by the Action Surge support gate.                                                                                                                                                                                                                                |
| Spell ids `magic_missile` and `ray_of_frost`   | `packages/battle-runtime/src/index.ts:2308-2412`               | Acceptable localized support gate; optional future extraction only | The ids gate the current Wizard spell slice, while procedure data is read from `SpellRecord` mechanics: level, casting time, range, attachment, damage, repeated target count, attack kind, and speed rider. This is name-shaped support gating, not dispatch on one spell reducer branch.                                                                                                                                         |
| `actionSpell` subject `spellId` / `spellActId` | `packages/battle-runtime/src/index.ts:1844-1896`, `:2495-2498` | Acceptable dispatch key plus authored identity                     | The subject identifies the selected supported Spell Invocation for replay. Resolution still dispatches on `actionSpell` and then the typed `SupportedSpellAct` family.                                                                                                                                                                                                                                                             |
| MCP battle tool names and descriptions         | `packages/mcp/src/battle-tools.ts:44-99`, `:111-230`           | Acceptable protocol identity                                       | MCP dispatch is by tool name and forwards battle subjects/fills to the runtime. It stores transient fill session state but does not reimplement named ability logic.                                                                                                                                                                                                                                                               |
| MCP character-to-battle composition            | `packages/mcp/src/battle-creature-init.ts:70-127`, `:215-260`  | Acceptable reader/composition boundary                             | The mapper reads selected Units, resources, loadout, and spells into battle init. Names remain catalog ids or user-facing labels; no named battle reducer logic is duplicated in MCP.                                                                                                                                                                                                                                              |

## Connascence Check

Strong coupling that remains:

- `fighter_action_surge` must stay coupled to the supported Unit fixture and the
  Action Surge support helper, but the current coupling is too strong and split
  across discovery and resolution. The id, activation mechanics checks,
  single-phase/single-effect cardinality, and `grant_extra_action` restriction
  must change together. PBA3 should weaken this by centralizing Action Surge
  support-gate parsing into one helper that returns a narrowed supported Unit
  feature shape used by both `supportedUnitFeatureActs` and `resolveUnitFeature`.
- `magic_missile` and `ray_of_frost` must stay coupled to the supported spell
  fixtures and their local spell support helpers. The coupling is by
  meaning/value but localized to two helper functions that also verify the
  relevant mechanics shape before constructing `SupportedSpellAct`.
- Battle hole ids for attack and spell replay are protocol literals. They are
  centralized through constants or generated from the selected spell/damage
  expression and are not authored ability dispatch.

No distant reducer/MCP duplicate procedure logic was found. MCP forwards
runtime subjects and fills; it does not derive Goblin, Skeleton, Action Surge,
Magic Missile, or Ray of Frost behavior independently. The harmful drift is
inside the runtime Action Surge support gate, not between runtime and MCP.

## PBA3 Scope

Recommended PBA3 path: correct Action Surge support-gate parsing without
broadening battle behavior.

PBA3 should:

- Replace the id-only discovery gate plus late `actionSurgeRestriction` check
  with one centralized parser for the currently supported Action Surge Unit
  feature shape.
- Make the admitted activation-mechanics assumptions executable at that parser:
  class feature id, free activation, use-count resource, short/long rest reset,
  once-per-turn use, exactly one direct phase, exactly one `grant_extra_action`
  effect, and the returned action restriction.
- Thread the narrowed result into both `supportedUnitFeatureActs` and
  `resolveUnitFeature`, so a Unit feature cannot be advertised unless resolution
  will accept the same shape.

Spell support gates around `magic_missile` and `ray_of_frost` remain optional
future readability cleanup only. Do not widen spell behavior in PBA3.

## RAW And Language Check

No modeled rule changed in this audit. The audit checked the existing
traceability anchors already recorded in `packages/battle-runtime/README.md`:
Action Surge, Wizard Spellcasting, Magic Missile, Ray of Frost, Attack
resolution, Stat Block named attacks, and Skeleton damage modifiers. Spell
ownership terms were checked against `UBIQUITOUS_LANGUAGE.md` to preserve the
distinction between Spell Definition, Spell Access, Spell Invocation, and Spell
Effect.

## Verification

- Source-only code/docs audit completed.
- No battle MBT run, per PBA2 verification scope.
- `/simplify` round 1: rechecked reducer named references and separated support
  gates from dispatch identity. Found Action Surge discovery/resolution support
  drift and assigned it to PBA3.
- `/simplify` round 2: rechecked MCP composition and Surface reader boundaries
  for duplicated named procedure logic. No MCP-side correction required; PBA3
  remains a runtime support-gate centralization task.
