// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.druid-wild-shape-known-form
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.WILD_SHAPE_FORM_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL
// StatBlock action-option and resource helpers extracted from battle-reducer.ts.
// Cluster V (statblock). Mechanical extraction — no behavior change.
// V depends on W (statblock-attacks.ts) for supportedStatBlockAttack* and
// vice versa; ESM tolerates the cycle because all bindings are function values
// accessed only at call time.

import { resourceCount } from "@dnd/shared/types";
import type {
  CreatureActions,
  CreatureLimitedUse,
  CreatureNamedAttackRoll,
  StatBlockRecord,
} from "@dnd/surface/surface/types";
import { Match } from "effect";
import type {
  StatBlockAttackActionOption,
  StatBlockDailyUseState,
  StatBlockLimitedUseSnapshot,
  StatBlockMutableResourceState,
  StatBlockPartKey,
  StatBlockPartSection,
  StatBlockResourceSnapshot,
  SupportedAttackActionOption,
  SupportedCreatureNamedAttackRoll,
  SupportedStaticDamageCreatureNamedAttackRoll,
} from "../battle-action-options.ts";
import {
  type BattleState,
  type StatBlockBattleCreatureState,
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import { creatureNamedAttackRollIsSupported } from "../statblock-action-support.ts";
import {
  statBlockAttackDamageSupportsStaticNotation,
  supportedStatBlockAttackDamage,
} from "../statblock-attack-damage-support.ts";
import {
  activeDruidWildShape,
  updateActiveDruidWildShapeResources,
} from "./druid-wild-shape.ts";

export function supportedStatBlockAttackActionOption(
  attack: CreatureNamedAttackRoll,
  part: StatBlockPartKey,
): Extract<
  StatBlockAttackActionOption,
  { readonly damageNotation: "rolled" }
> | null;
export function supportedStatBlockAttackActionOption(
  attack: CreatureNamedAttackRoll,
  part: StatBlockPartKey,
  damageNotation: "rolled",
): Extract<
  StatBlockAttackActionOption,
  { readonly damageNotation: "rolled" }
> | null;
export function supportedStatBlockAttackActionOption(
  attack: CreatureNamedAttackRoll,
  part: StatBlockPartKey,
  damageNotation: "static",
): Extract<
  StatBlockAttackActionOption,
  { readonly damageNotation: "static" }
> | null;
export function supportedStatBlockAttackActionOption(
  attack: CreatureNamedAttackRoll,
  part: StatBlockPartKey,
  damageNotation: StatBlockAttackActionOption["damageNotation"] = "rolled",
): StatBlockAttackActionOption | null {
  if (!isSupportedCreatureNamedAttackRoll(attack)) {
    return null;
  }

  if (damageNotation === "static") {
    return statBlockAttackSupportsStaticDamageNotation(attack)
      ? {
          kind: "statBlockAttack",
          attack,
          part,
          damageNotation,
        }
      : null;
  }

  return {
    kind: "statBlockAttack",
    attack,
    part,
    damageNotation: "rolled",
  };
}

export function statBlockAttackActionOptions(
  statBlock: StatBlockRecord,
): readonly StatBlockAttackActionOption[] {
  const actionAttacks = statBlockActionSectionAttackOptions(
    "actions",
    statBlock.statBlock.actions,
  );
  const legendaryAttacks = statBlockActionSectionAttackOptions(
    "legendaryActions",
    statBlock.statBlock.legendaryActions?.actions,
  );

  return [...actionAttacks, ...legendaryAttacks];
}

export function attackActionOptionIsOrdinaryAttackAction(
  attack: SupportedAttackActionOption,
): boolean {
  return attack.kind !== "statBlockAttack" || attack.part.section === "actions";
}

export function statBlockActionSectionAttackOptions(
  section: StatBlockPartSection,
  actions: CreatureActions | undefined,
): readonly StatBlockAttackActionOption[] {
  return (
    actions?.attacks?.flatMap((attack) => {
      const part = {
        section,
        name: attack.name,
      };
      const option = supportedStatBlockAttackActionOption(attack, part);
      if (option == null) return [];
      const staticOption = supportedStatBlockAttackActionOption(
        attack,
        part,
        "static",
      );
      return staticOption === null ? [option] : [option, staticOption];
    }) ?? []
  );
}

export function isSupportedCreatureNamedAttackRoll(
  attack: CreatureNamedAttackRoll,
): attack is SupportedCreatureNamedAttackRoll {
  return creatureNamedAttackRollIsSupported(attack);
}

function statBlockAttackSupportsStaticDamageNotation(
  attack: SupportedCreatureNamedAttackRoll,
): attack is SupportedStaticDamageCreatureNamedAttackRoll {
  return statBlockAttackDamageSupportsStaticNotation(
    supportedStatBlockAttackDamage(attack),
  );
}

export function statBlockResourceState(
  statBlock: StatBlockRecord["statBlock"],
): StatBlockMutableResourceState {
  const limitedUses = statBlockLimitedUseInitialStates(statBlock);
  assertUniqueStatBlockPartKeys(
    limitedUses.dailyUses.map((state) => state.key),
  );
  assertUniqueStatBlockPartKeys(limitedUses.rechargeParts);
  assertUniqueStatBlockPartKeys(limitedUses.restRechargeParts);
  return {
    legendaryActionUsesRemaining: resourceCount(
      statBlock.legendaryActions?.uses ?? 0,
    ),
    dailyUses: limitedUses.dailyUses,
    unavailableRechargeParts: [],
    unavailableRestRechargeParts: [],
  };
}

export function statBlockLimitedUseInitialStates(
  statBlock: StatBlockRecord["statBlock"],
): {
  readonly dailyUses: readonly StatBlockDailyUseState[];
  readonly rechargeParts: readonly StatBlockPartKey[];
  readonly restRechargeParts: readonly StatBlockPartKey[];
} {
  const states = statBlockAuthoredLimitedUses(statBlock);
  return {
    dailyUses: states.flatMap((state) =>
      state.kind === "daily"
        ? [{ key: state.key, usesRemaining: resourceCount(state.uses) }]
        : [],
    ),
    rechargeParts: states.flatMap((state) =>
      state.kind === "recharge" ? [state.key] : [],
    ),
    restRechargeParts: states.flatMap((state) =>
      state.kind === "recharge_after_rest" ? [state.key] : [],
    ),
  };
}

export function statBlockAuthoredLimitedUses(
  statBlock: StatBlockRecord["statBlock"],
): readonly StatBlockAuthoredLimitedUse[] {
  return [
    ...statBlockActionSectionLimitedUseInitialStates(
      "actions",
      statBlock.actions,
    ),
    ...statBlockActionSectionLimitedUseInitialStates(
      "bonusActions",
      statBlock.bonusActions,
    ),
    ...statBlockActionSectionLimitedUseInitialStates(
      "reactions",
      statBlock.reactions,
    ),
    ...statBlockActionSectionLimitedUseInitialStates(
      "legendaryActions",
      statBlock.legendaryActions?.actions,
    ),
  ];
}

type StatBlockAuthoredLimitedUse = CreatureLimitedUse & {
  readonly key: StatBlockPartKey;
};

export function statBlockActionSectionLimitedUseInitialStates(
  section: StatBlockPartSection,
  actions: CreatureActions | undefined,
): readonly StatBlockAuthoredLimitedUse[] {
  const attacks =
    actions?.attacks?.flatMap((attack) =>
      statBlockAuthoredLimitedUse(
        { section, name: attack.name },
        attack.limitedUse,
      ),
    ) ?? [];
  const saves =
    actions?.saves?.flatMap((save) =>
      statBlockAuthoredLimitedUse(
        { section, name: save.name },
        save.limitedUse,
      ),
    ) ?? [];
  const supports =
    actions?.supports?.flatMap((support) =>
      statBlockAuthoredLimitedUse(
        { section, name: support.name },
        support.limitedUse,
      ),
    ) ?? [];
  const actionOptions =
    actions?.actionOptions?.flatMap((option) =>
      statBlockAuthoredLimitedUse(
        { section, name: option.name },
        option.limitedUse,
      ),
    ) ?? [];

  return [...attacks, ...saves, ...supports, ...actionOptions];
}

export function statBlockAuthoredLimitedUse(
  key: StatBlockPartKey,
  limitedUse: CreatureLimitedUse | undefined,
): readonly StatBlockAuthoredLimitedUse[] {
  if (limitedUse === undefined) return [];
  return [{ ...limitedUse, key }];
}

export function statBlockResourceSnapshot(
  statBlock: StatBlockRecord["statBlock"],
  resources: StatBlockMutableResourceState,
): StatBlockResourceSnapshot {
  const authoredLimitedUses = statBlockLimitedUseInitialStates(statBlock);
  return {
    legendaryActions:
      statBlock.legendaryActions === undefined
        ? null
        : {
            usesMax: resourceCount(statBlock.legendaryActions.uses),
            usesRemaining: resources.legendaryActionUsesRemaining,
          },
    limitedUses: [
      ...authoredLimitedUses.dailyUses
        .map((daily) => {
          const authored = statBlockLimitedUseForPart(statBlock, daily.key);
          if (authored?.kind !== "daily") return null;
          return {
            key: daily.key,
            kind: "daily" as const,
            usesMax: resourceCount(authored.uses),
            usesRemaining: daily.usesRemaining,
          };
        })
        .filter(
          (
            state,
          ): state is Extract<
            StatBlockLimitedUseSnapshot,
            { readonly kind: "daily" }
          > => state !== null,
        ),
      ...authoredLimitedUses.rechargeParts.map((key) => {
        const authored = statBlockLimitedUseForPart(statBlock, key);
        if (authored?.kind !== "recharge") {
          throw new Error(
            "Recharge resource key must reference Recharge authored use.",
          );
        }
        return {
          key,
          kind: "recharge" as const,
          minimumRoll: authored.minimumRoll,
          available: !resources.unavailableRechargeParts.some((part) =>
            sameStatBlockPartKey(part, key),
          ),
        };
      }),
      ...authoredLimitedUses.restRechargeParts.map((key) => ({
        key,
        kind: "recharge_after_rest" as const,
        available: !resources.unavailableRestRechargeParts.some((part) =>
          sameStatBlockPartKey(part, key),
        ),
      })),
    ],
  };
}

export function statBlockLimitedUseForPart(
  statBlock: StatBlockRecord["statBlock"],
  key: StatBlockPartKey,
): CreatureLimitedUse | undefined {
  return statBlockAuthoredLimitedUses(statBlock).find((limitedUse) =>
    sameStatBlockPartKey(limitedUse.key, key),
  );
}

export function refreshStatBlockStartTurnResources(
  resources: StatBlockMutableResourceState,
  statBlock: StatBlockRecord["statBlock"],
): StatBlockMutableResourceState {
  return {
    ...resources,
    legendaryActionUsesRemaining: resourceCount(
      statBlock.legendaryActions?.uses ?? 0,
    ),
  };
}

export function statBlockAttackResourceAvailable(
  statBlock: StatBlockRecord["statBlock"],
  resources: StatBlockMutableResourceState,
  attack: StatBlockAttackActionOption,
): boolean {
  return (
    statBlockPartLimitedUseAvailable(statBlock, resources, attack.part) &&
    (attack.part.section !== "legendaryActions" ||
      resources.legendaryActionUsesRemaining > 0)
  );
}

export function statBlockPartLimitedUseAvailable(
  statBlock: StatBlockRecord["statBlock"],
  resources: StatBlockMutableResourceState,
  key: StatBlockPartKey,
): boolean {
  const limitedUse = statBlockLimitedUseForPart(statBlock, key);
  if (limitedUse === undefined) return true;
  return Match.value(limitedUse).pipe(
    Match.when(
      { kind: "daily" },
      () =>
        (resources.dailyUses.find((state) =>
          sameStatBlockPartKey(state.key, key),
        )?.usesRemaining ?? 0) > 0,
    ),
    Match.when(
      { kind: "recharge" },
      () =>
        !resources.unavailableRechargeParts.some((part) =>
          sameStatBlockPartKey(part, key),
        ),
    ),
    Match.when(
      { kind: "recharge_after_rest" },
      () =>
        !resources.unavailableRestRechargeParts.some((part) =>
          sameStatBlockPartKey(part, key),
        ),
    ),
    Match.exhaustive,
  );
}

export function spendStatBlockAttackResources(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly attack: SupportedAttackActionOption;
}): BattleState {
  if (input.attack.kind !== "statBlockAttack") {
    return input.state;
  }
  const actor = input.state.combatants.get(input.actorId);
  const wildShape = activeDruidWildShape(actor);
  if (actor?.origin.kind === "character" && wildShape !== null) {
    const resources = spendStatBlockPartResources(
      wildShape.form.statBlock,
      wildShape.effect.resources,
      input.attack.part,
    );
    return {
      ...input.state,
      combatants: new Map(input.state.combatants).set(
        input.actorId,
        updateActiveDruidWildShapeResources(actor, resources),
      ),
    };
  }
  if (actor?.origin.kind !== "statBlock") {
    return input.state;
  }

  const resources = spendStatBlockPartResources(
    actor.origin.statBlock.statBlock,
    actor.origin.resources,
    input.attack.part,
  );
  const combatants = new Map(input.state.combatants);
  combatants.set(input.actorId, {
    ...actor,
    origin: {
      ...actor.origin,
      resources,
    },
  });
  return { ...input.state, combatants };
}

export function updateStatBlockActorResources(
  state: BattleState,
  actor: StatBlockBattleCreatureState,
  part: StatBlockPartKey,
): BattleState {
  const currentActor = state.combatants.get(actor.combatantId);
  if (currentActor?.origin.kind !== "statBlock") {
    return state;
  }
  const resources = spendStatBlockPartResources(
    currentActor.origin.statBlock.statBlock,
    currentActor.origin.resources,
    part,
  );
  return {
    ...state,
    combatants: new Map(state.combatants).set(actor.combatantId, {
      ...currentActor,
      origin: {
        ...currentActor.origin,
        resources,
      },
    }),
  };
}

export function spendStatBlockPartResources(
  statBlock: StatBlockRecord["statBlock"],
  resources: StatBlockMutableResourceState,
  key: StatBlockPartKey,
): StatBlockMutableResourceState {
  const limitedUse = statBlockLimitedUseForPart(statBlock, key);
  return {
    legendaryActionUsesRemaining:
      key.section === "legendaryActions"
        ? resourceCount(Number(resources.legendaryActionUsesRemaining) - 1)
        : resources.legendaryActionUsesRemaining,
    dailyUses:
      limitedUse?.kind === "daily"
        ? resources.dailyUses.map((state) =>
            sameStatBlockPartKey(state.key, key)
              ? {
                  ...state,
                  usesRemaining: resourceCount(Number(state.usesRemaining) - 1),
                }
              : state,
          )
        : resources.dailyUses,
    unavailableRechargeParts:
      limitedUse?.kind === "recharge" &&
      !resources.unavailableRechargeParts.some((part) =>
        sameStatBlockPartKey(part, key),
      )
        ? [...resources.unavailableRechargeParts, key]
        : resources.unavailableRechargeParts,
    unavailableRestRechargeParts:
      limitedUse?.kind === "recharge_after_rest" &&
      !resources.unavailableRestRechargeParts.some((part) =>
        sameStatBlockPartKey(part, key),
      )
        ? [...resources.unavailableRestRechargeParts, key]
        : resources.unavailableRestRechargeParts,
  };
}

export function statBlockSectionMatchesSubject(
  attack: SupportedAttackActionOption,
  section: StatBlockPartSection | undefined,
): boolean {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, () => section === undefined),
    Match.when({ kind: "unarmedStrike" }, () => section === undefined),
    Match.when(
      { kind: "statBlockAttack" },
      (option) => option.part.section === (section ?? "actions"),
    ),
    Match.exhaustive,
  );
}

export function statBlockSubjectPart(attack: SupportedAttackActionOption): {
  readonly statBlockSection?: StatBlockPartSection;
  readonly statBlockDamageNotation?: "static";
} {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, () => ({})),
    Match.when({ kind: "unarmedStrike" }, () => ({})),
    Match.when({ kind: "statBlockAttack" }, (option) => ({
      ...(option.part.section === "actions"
        ? {}
        : { statBlockSection: option.part.section }),
      ...(option.damageNotation === "static"
        ? { statBlockDamageNotation: "static" as const }
        : {}),
    })),
    Match.exhaustive,
  );
}

export function sameStatBlockPartKey(
  left: StatBlockPartKey,
  right: StatBlockPartKey,
): boolean {
  return left.section === right.section && left.name === right.name;
}

export function assertUniqueStatBlockPartKeys(
  keys: readonly StatBlockPartKey[],
): void {
  const seen = new Set<string>();
  for (const key of keys) {
    const encoded = statBlockPartKeyString(key);
    if (seen.has(encoded)) {
      throw new Error(
        `Duplicate limited-use Stat Block part: ${key.section}/${key.name}`,
      );
    }
    seen.add(encoded);
  }
}

export function statBlockPartKeyString(key: StatBlockPartKey): string {
  return `${key.section}\u0000${key.name}`;
}
