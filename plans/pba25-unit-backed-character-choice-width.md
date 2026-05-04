# PBA25 Research Plan - Unit-Backed Character Choice Width

Task: PBA25 - Promote Unit-Backed Character Choice Width

Status: draft research plan.

## Purpose

Move Core's direct character-choice concepts into the promoted Surface/Unit
path without importing Core vocabulary into non-Surface runtime packages.
Examples include subclass choices, feat/ASI/Epic Boon selections, multiclass
skill/tool gains, and proficiency grants. Runtime packages should see Surface
reader facts, Unit-backed holes, selected Unit refs, support profiles, and
derived build projections.

This task owns the generic class-feature grant and retained-Unit machinery that
PBA24 needs for Rogue Cunning Action. PBA24 owns removal of the MCP support
profile workaround and battle support interpretation.

## Research Scope

- Inventory Core character-domain choice families and issue codes that still
  affect legal finalized characters.
- For each family, identify whether Surface already has:
  - authored Unit records;
  - structural readers;
  - choice-hole source keys;
  - retained selected Unit refs;
  - build projection support.
- Identify gaps where Surface needs a new record shape or reader before runtime
  support can be honest.
- Keep runtime support gates package-private and source-shaped. Do not add
  runtime branches on concrete authored ids or Core-style enum values.
- Replace class-named creation choice keys such as `fighter_skill_choices`,
  `wizard_skill_choices`, and `fighter_fighting_style` with domain/source-shaped
  keys derived from Surface reader facts. Otherwise every widened class choice
  adds another runtime vocabulary leak.
- Treat subclass choice as a first-class Surface modeling question. Current
  evidence says there is no `SubclassRecord`/subclass Unit shape; subclass-like
  content is encoded as plain class features.

## Expected Implementation Direction

- Surface records/readers own authored choice structure.
- Character creation discovers holes from selected Units and ordered
  progression.
- Fills retain Unit refs or typed runtime choices whose source facts come from
  Surface readers.
- `CharacterBuild` projects only durable build facts needed by later promoted
  boundaries.
- Add generic Surface reader projections for class-feature creation grants
  before broad runtime support:
  - `grant_feat` for feat/ASI/Epic Boon slots;
  - `grant_proficiency` for skill/tool/language/expertise-style grants;
  - `weapon_mastery_choice`;
  - subclass or class-branch selection once Surface owns that shape.
- Keep `support-gates.ts` as the only current admission boundary, but make
  entries source-shaped by choice family/profile rather than by class-specific
  runtime names.
- Cunning Action may be used as a representative class-feature grant case, but
  this task must stop at retaining/projecting the Unit facts. MCP support
  profile attachment and Bonus Action action-cost semantics remain PBA24.

## Ordering Notes

1. Add a Surface subclass boundary and reader before promoted subclass holes.
2. Add a generic class-feature creation grant reader for existing mechanics
   atoms.
3. Widen proficiency grant subjects before multiclass/class proficiency holes.
4. Add a feat creation reader before ASI/Epic Boon/general feat holes.
5. Expand runtime `UnitChoiceKey`, discovery, finalization, and build projection
   after the relevant reader exists.
6. Update QNT/MBT after reducer protocol or bridge shape changes.

## Verification

- RAW/UL check for each widened choice family.
- Surface reader/schema tests for new Unit shapes.
- Character-creation reducer tests for hole discovery, fill validation,
  finalization, and `CharacterBuild` projection.
- Update `character-creation-runtime-slice.qnt` and MBT only when reducer
  behavior or bridge shape changes.
- `pnpm --filter @dnd/surface typecheck`
- `pnpm --filter @dnd/surface test`
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- `pnpm --filter @dnd/character-creation-runtime test`
- `pnpm check:authored-id-dispatch`
- No battle MBT unless widened choices affect battle initialization or replay.
- `/simplify` convergence, minimum two rounds.
