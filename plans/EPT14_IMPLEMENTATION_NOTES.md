# EPT14 Implementation Notes

This note captures the most important landed code seams for the current `EPT14` battle-side identity cut.

## 1. Battle spell access now has explicit access identity

File: [packages/core/src/battle-spell-access.ts](/workspace/typescript/dnd/packages/core/src/battle-spell-access.ts:56)

```ts
export type BattleSpellAccess =
  | {
      readonly tag: "prepared";
      readonly accessId: BattleSpellAccessId;
      readonly projection: BattleSpellAccessProjection;
      readonly spellId: SpellId;
      readonly spellSaveDC: DifficultyClass;
      readonly resourcePath: { readonly kind: "spellSlotLadder" };
    }
  | {
      readonly tag: "statBlockActionGranted";
      readonly accessId: BattleSpellAccessId;
      readonly projection: BattleSpellAccessProjection;
      readonly spellId: SpellId;
      readonly spellSaveDC: DifficultyClass;
      readonly resourcePath: {
        readonly kind: "dailyUse";
        readonly usageId: string;
        readonly fixedCastLevel: SpellSlotLevel;
      };
    };
```

Short explanation:
- `BattleSpellAccess` now separates:
  - `accessId`: the concrete access path used at runtime
  - `spellId`: bookkeeping/provenance identity
- This is the main EPT14 ownership cut on the TS battle side.

## 2. Prepared/stat-block access ids are semantic, not opaque

File: [packages/core/src/battle-spell-access.ts](/workspace/typescript/dnd/packages/core/src/battle-spell-access.ts:96)

```ts
export function preparedBattleSpellAccess(params: {
  readonly spellId: SpellId;
  readonly spellSaveDC: DifficultyClass;
}): BattleSpellAccess {
  return {
    tag: "prepared",
    accessId: battleSpellAccessId(`prepared:${params.spellId}`),
    projection: projectBattleSpellAccess(params.spellId),
    spellId: params.spellId,
    spellSaveDC: params.spellSaveDC,
    resourcePath: { kind: "spellSlotLadder" },
  };
}
```

File: [packages/core/src/battle-spell-access.ts](/workspace/typescript/dnd/packages/core/src/battle-spell-access.ts:107)

```ts
export function statBlockActionGrantedBattleSpellAccess(params: {
  readonly spellId: SpellId;
  readonly spellSaveDC: DifficultyClass;
  readonly usageId: string;
  readonly fixedCastLevel: SpellSlotLevel;
}): BattleSpellAccess {
  return {
    tag: "statBlockActionGranted",
    accessId: battleSpellAccessId(
      `statBlockActionGranted:${params.usageId}:${params.spellId}:${params.fixedCastLevel}`,
    ),
    projection: projectBattleSpellAccess(params.spellId),
    spellId: params.spellId,
    spellSaveDC: params.spellSaveDC,
    resourcePath: {
      kind: "dailyUse",
      usageId: params.usageId,
      fixedCastLevel: params.fixedCastLevel,
    },
  };
}
```

Short explanation:
- Access ids are intentionally derived from provenance/resource shape.
- The goal is that same-spell different-access states are representable and visible.

## 3. Battle action discovery now emits one token per concrete access

File: [packages/core/src/available-actions.ts](/workspace/typescript/dnd/packages/core/src/available-actions.ts:4250)

```ts
tokens.push(
  battleToken<
    Extract<BattleActionToken, { readonly type: "BATTLE_CAST_SAVE_SPELL" }>
  >({
    actorId,
    type: "BATTLE_CAST_SAVE_SPELL",
    accessId: access.accessId,
    spellId: access.spellId,
    slotLevel: { options: slotOptions },
    targetId: { options: targetOptions },
    cost: battleCastableSpellCost(access),
    outcome: {
      summary: `Spend your ${battleCastableSpellSpend(access)} to cast ${displaySpellName(
        access.spellId as SpellName,
      )} against the chosen target with an explicit save roll`,
    },
  }),
);
```

Short explanation:
- Discovery no longer flattens to “one spell token per spell name.”
- Tokens are now access-scoped, which is what made ambiguous same-spell access paths representable.

## 4. Resolved battle actions now match by access identity, with a narrow compatibility path

File: [packages/core/src/available-actions.ts](/workspace/typescript/dnd/packages/core/src/available-actions.ts:5220)

```ts
const sameAccessOrCompat = (
  candidateAccessId: string | undefined,
  tokenAccessId: string | undefined,
) => tokenAccessId == null || candidateAccessId === tokenAccessId;
```

File: [packages/core/src/available-actions.ts](/workspace/typescript/dnd/packages/core/src/available-actions.ts:5270)

```ts
if (
  candidate.type === "BATTLE_CAST_SAVE_SPELL" &&
  token.type === "BATTLE_CAST_SAVE_SPELL"
) {
  return (
    sameAccessOrCompat(candidate.accessId, token.accessId) &&
    candidate.spellId === token.spellId &&
    candidate.slotLevel.options.includes(token.slotLevel) &&
    candidate.targetId.options.includes(token.targetId)
  );
}
```

Short explanation:
- If a caller provides `accessId`, matching is exact.
- If a caller omits it, there is still a compatibility path for older resolved-token callers.

## 5. The chosen access gets normalized into the runtime request token

File: [packages/core/src/available-actions.ts](/workspace/typescript/dnd/packages/core/src/available-actions.ts:5741)

```ts
const chosenAccessId = token.accessId ?? availableToken.accessId;
return {
  token: { ...token, accessId: chosenAccessId },
  outcome: availableToken.outcome.summary,
  runtime: "none",
  event: {
    type: "BATTLE_RESOLVE_COUNTERSPELL",
    reactorId: CreatureId(token.actorId),
    decision: { tag: "RCounterspell", saveSucceeded: false },
    ...(chosenAccessId == null
      ? {}
      : { accessId: battleSpellAccessId(chosenAccessId) }),
    csSlotLvl: token.slotLevel,
  },
};
```

Short explanation:
- `resolveBattleAction(...)` now fills in the concrete chosen access on the request token itself.
- This keeps `resolveBattleAction(...)` and `finalizeBattleResolution(...)` on the same identity seam.

## 6. Live spell-cast reducers resolve a concrete access and fail closed on mismatches

File: [packages/core/src/battle-machine-actions-spell-cast.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-actions-spell-cast.ts:33)

```ts
const access = resolveBattleSpellAccess({
  accesses: ac.spellAccesses,
  accessId: e.accessId,
  spellId: currentSpellId,
});
const resolvedAccess = Option.getOrNull(access);
if (e.accessId != null && resolvedAccess == null) return {};
```

Short explanation:
- A concrete access id now actually matters in reducers.
- If the event claims a specific access that does not exist, the cast is rejected.

## 7. Runtime spell bookkeeping now stores both access identity and spell identity

File: [packages/core/src/battle-machine-types.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-types.ts:325)

```ts
export interface SpellCastCtx {
  readonly caster: CreatureId;
  readonly accessId: BattleSpellAccessId;
  readonly spellId: SpellId;
  readonly postCast: PostCastEffect;
  readonly slotLvl: SpellSlotLevel | 0;
  readonly ritual: boolean;
}
```

Short explanation:
- `accessId` is the concrete runtime path.
- `spellId` remains for bookkeeping/provenance.
- This is the intended identity split at invocation time.

## 8. Counterspell now resolves through projected access facts

File: [packages/core/src/battle-machine-actions-spell-reaction.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-actions-spell-reaction.ts:87)

```ts
const counterspellAccess =
  e.accessId == null
    ? reactor.spellAccesses.find(
        (access) => access.projection.reactionResolution === "counterspell",
      )
    : Option.getOrNull(battleSpellAccessById(reactor.spellAccesses, e.accessId));
if (counterspellAccess == null) return {};
```

Short explanation:
- Counterspell no longer keys semantic legality off spell id.
- It now uses the projected access shape plus access identity.

## 9. Shield legality now routes through access projection instead of spell-id checks

File: [packages/core/src/battle-machine-helpers.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-helpers.ts:616)

```ts
const shieldAccesses = battleReactionSpellAccesses(c, {
  trigger: "onHitByAttackRoll",
  resolution: "shieldArmorClassBonus",
}).filter(
  (access) =>
    !c.slotExpendedThisTurn &&
    canProvideBattleSpellComponentsForAccess(c, access) &&
    battleSpellAccessHasAvailableResource(c, access),
);
```

Short explanation:
- This is one of the main remaining TS helper seams that EPT14 absorbed.
- The rule now asks for “a legal reaction spell access with shield-like projected behavior,” not “spell id == shield.”

## 10. Raw attack resolution still honors explicit battle AC inputs, but applies owned AC bonuses on top

File: [packages/core/src/battle-machine-actions-attack.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-actions-attack.ts:199)

```ts
const effectiveTargetAc =
  targetAc + (target.isWearingArmor ? target.defenseArmorClassBonus : 0);
const hit =
  !mods.autoMiss &&
  isHitWithAttackRollBonus(
    attackRoll,
    effectiveTargetAc,
    critRange,
    attackRollBonus,
  );
```

Short explanation:
- This was an important bug fix uncovered during EPT14.
- The raw battle surface still supplies `tAc`, but battle-owned Defense-style bonuses still matter.

## 11. Raw generic spell-lane events still work, but only as a compatibility seam

File: [packages/core/src/battle-machine-actions-spell-aoe.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-actions-spell-aoe.ts:67)

```ts
const access = resolveBattleSpellAccess({
  accesses: ac.spellAccesses,
  accessId: e.accessId,
  spellId: currentSpellId,
});
const resolvedAccess = Option.getOrNull(access);
if (e.accessId != null && resolvedAccess == null) {
  return {};
}
```

File: [packages/core/src/battle-machine-actions-spell-aoe.ts](/workspace/typescript/dnd/packages/core/src/battle-machine-actions-spell-aoe.ts:120)

```ts
const spellCtx: SpellCastCtx = {
  caster: id,
  accessId:
    resolvedAccess?.accessId ??
    battleSpellAccessId(`rawAoE:${currentSpellId}`),
  spellId: currentSpellId,
  postCast: { tag: "PCEAoE", aoe: aoeCtx },
  slotLvl: e.slotLvl,
  ritual: e.ritual,
};
```

Short explanation:
- Raw direct battle events can still drive generic spell families for tests and compatibility.
- When no modeled access exists, battle uses a bookkeeping-only synthetic access id instead of pretending it used a real authored access path.

## 12. Active plan note updated to reflect what actually landed

File: [plans/ACTIVE_PLAN.md](/workspace/typescript/dnd/plans/ACTIVE_PLAN.md:138)

```md
2026-04-19: TS battle spellcasting now carries explicit `accessId` on
`BattleSpellAccess`, battle action tokens, ready state, spell-cast stack
bookkeeping, and counterspell/refund paths. Battle discovery now surfaces
one token per concrete spell access instead of flattening same-spell
accesses together...
```

Short explanation:
- The plan note now reflects the battle-side access identity cut that actually landed.
- It also keeps the remaining non-battle `CAST_PREPARED_SPELL` seam explicit instead of pretending EPT14 is fully closed.
