import { Match } from "effect";
// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-MULTIATTACK-001
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties stat-block.multiattack unit-feature.druid-wild-shape-known-form unit-feature.light-extra-attack-damage-ability-modifier unit-feature.martial-arts-attack-projection unit-feature.paladin-sacred-weapon spell.invocation-weapon-attack-override spell.invocation-magic-weapon-enhancement spell.invocation-self-transformation-mode
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.ATTACK_BRANCHES BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE BATTLE.SPELL.SLOW_MULTIATTACK_ATTACK_CAP BATTLE.STAT_BLOCK.MULTIATTACK
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SELF_TRANSFORMATION_MODE BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS

import { attackDamageDiceRequest } from "./attack-damage-dice-request.ts";
import {
  nonEmptyArrayProperty,
  optionalProperty,
} from "../optional-property.ts";
import {
  abilityModifier,
  attackBonus,
  type AbilityModifier,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import {
  holeId,
  holeInstanceKey,
  type AttackRollResult,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { isMonkWeapon } from "@dnd/shared-algebras/martial-arts-algebra";
import type { HoleInstanceKey } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  type BattleObjectId,
  type BattleProcedureExecutionRef,
  type CombatantId,
} from "../identity.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import {
  CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  characterUnitProcedure,
  type UnitFeatureProcedureExecution,
} from "../character-execution-queries.ts";
import { isPresentSpawnedCompanionCombatant } from "../spawned-companion-state.ts";
import {
  attackExecutionSelectionForOption,
  boundAttackExecutionSelectionKey,
  boundAttackExecutionSelectionMatchesOption,
  unboundAttackActionOption,
} from "../battle-action-options.ts";
import type {
  BoundCharacterUnarmedStrikeActionOption,
  BoundCharacterWeaponAttackActionOption,
  BoundSupportedAttackActionOption,
  CharacterWeaponAttackAbilityChoice,
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackActionOption,
  SupportedAttackActionOption,
} from "../battle-action-options.ts";
import { attackDamageAbilityModifierChoiceProcedureRefs } from "./attack-damage-ability-modifier-choice.ts";
import {
  LIGHT_EXTRA_ATTACK_DAMAGE_ABILITY_MODIFIER_SUPPORT_PROFILE,
  MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE,
} from "../unit-feature-execution-constants.ts";
import {
  type AttackDamageRider,
  type BattleAttackDamageDisposition,
  type BattleActiveEffect,
  type BattleAttackDamageDispositionHole,
  type BattleCreatureState,
  type BattleDamageRollHole,
  type BattleFill,
  type BattleHoleId,
  type BattleState,
  type CharacterBattleCreatureState,
  type WeaponAttackDamageEnhancementBonus,
  type SpellMarkedDamageRider,
  type SpellAttackDamageComponent,
} from "../battle-state-execution.ts";
import {
  ATTACK_DAMAGE_DISPOSITION_HOLE_ID,
  ATTACK_DAMAGE_DISPOSITION_HOLE_INSTANCE,
} from "./battle-runtime-protocol.ts";
import {
  hasStatBlockMultiattackContinuationResource,
  statBlockMultiattackActionResourceMatchesProcedure,
} from "./action-resource-kinds.ts";
import { weaponAttackDamageEnhancementBonus } from "./spell-modifier-binding.ts";
import { attackDamageDieFloorChoiceProcedureRefs } from "./attack-damage-die-floor-choice.ts";
import {
  damageAllowsKnockOut,
  hpDamageProjection,
  zeroHitPointReplacementCapabilities,
} from "./damage-apply.ts";
import {
  attackActionOptionName,
  attackAbilityAndDamageTypeOptions,
  characterWeaponAttackDeliveryOptions,
  attackCanCarryKnockOutChoice,
  weaponAttackDamageExpression,
} from "./statblock-attacks.ts";
import { activeSelfTransformationNaturalWeaponsEffect } from "./spells-active-effects.ts";
import { scoreModifier } from "./domain-helpers.ts";
import { statBlockAttackActionOptions } from "./statblock.ts";
import { statBlockProcedureResourcesAvailable } from "../stat-block-execution-state.ts";
import { ammunitionForAttackIsReady } from "../battle-ammunition.ts";
import {
  activeDruidWildShape,
  activeDruidWildShapeEffect,
  combatantD20AbilityModifier,
} from "./druid-wild-shape.ts";
import {
  wildShapeWornLoadoutObjectForUse,
  type WildShapeLoadoutObjectRef,
  type WildShapeWornLoadoutObjectRef,
} from "./wild-shape-equipment.ts";
import { battleObjectIsOnGround } from "./object-custody-queries.ts";
import { combatantHandUses } from "./creature-state-leaves.ts";
import {
  characterEffectiveLoadoutFromOrigin,
  loadoutWeaponIsHeld,
  loadoutWeaponIsStowed,
} from "./character-effective-loadout.ts";
import { weaponAttackIsThrown } from "./thrown-weapon-attack.ts";

export function attackDamageHole(
  attack: SupportedAttackActionOption,
  critical = false,
  attackRoll?: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[] = [],
  spellWeaponDamageRiders: readonly SpellAttackDamageComponent[] = [],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
  ongoingDamageModifier = 0,
  weaponDamageDiceRollChoiceProcedureRefs: readonly BattleProcedureExecutionRef[] = [],
  eligibleAttackDamageDieFloorChoiceProcedureRefs: readonly BattleProcedureExecutionRef[] = [],
  cunningStrikeOptions: BattleDamageRollHole["cunningStrikeOptions"] = [],
): BattleDamageRollHole {
  const expression = weaponAttackDamageExpression(
    attack,
    critical,
    attackRoll,
    [],
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
    ongoingDamageModifier,
  );
  const name = attackActionOptionName(attack);
  const damageDieFloorProcedureRefs = attackDamageDieFloorChoiceProcedureRefs(
    eligibleAttackDamageDieFloorChoiceProcedureRefs,
  );
  return {
    kind: "rolledDice",
    holeId: attackDamageHoleId(
      attack,
      critical,
      attackRoll,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
      ongoingDamageModifier,
    ),
    holeInstanceKey: holeInstanceKey(
      `battle:attack:damage-result:${expression}`,
    ),
    label: `${name} damage (${expression})`,
    attack: unboundAttackActionOption(attack),
    critical,
    damageDice: attackDamageDiceRequest({
      attack,
      critical,
      ...optionalProperty("attackRoll", attackRoll),
      attackDamageRiders,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
      cunningStrikeOptions,
    }),
    ...nonEmptyArrayProperty("attackDamageRiders", attackDamageRiders),
    ...nonEmptyArrayProperty(
      "spellWeaponDamageRiders",
      spellWeaponDamageRiders,
    ),
    ...nonEmptyArrayProperty(
      "spellMarkedDamageRiders",
      spellMarkedDamageRiders,
    ),
    ...nonEmptyArrayProperty("cunningStrikeOptions", cunningStrikeOptions),
    ...nonEmptyArrayProperty(
      "weaponDamageDiceRollChoiceProcedureRefs",
      weaponDamageDiceRollChoiceProcedureRefs,
    ),
    ...(damageDieFloorProcedureRefs === null
      ? {}
      : {
          attackDamageDieFloorChoiceProcedureRefs: damageDieFloorProcedureRefs,
        }),
    ...(attack.kind !== "weapon" ||
    attack.attackDamageAbilityModifierChoice === undefined
      ? {}
      : {
          attackDamageAbilityModifierChoice:
            attack.attackDamageAbilityModifierChoice,
        }),
  };
}

export function attackDamageDispositionHole(input: {
  readonly attack: SupportedAttackActionOption;
  readonly attackerId: CombatantId;
  readonly target: BattleCreatureState;
  readonly damageAmount: number;
}): BattleAttackDamageDispositionHole | null {
  const choices: BattleAttackDamageDisposition[] = [
    { kind: "ordinaryDamage" },
    ...zeroHitPointReplacementChoices(input.target, input.damageAmount),
    ...(attackCanCarryKnockOutChoice(input.attack) &&
    damageAllowsKnockOut(input.target, input.damageAmount)
      ? [{ kind: "knockOut" } as const]
      : []),
  ];
  return choices.length > 1
    ? {
        kind: "attackDamageDisposition",
        damageOccurrence: { kind: "untrackedDamage" },
        holeId: ATTACK_DAMAGE_DISPOSITION_HOLE_ID,
        holeInstanceKey: ATTACK_DAMAGE_DISPOSITION_HOLE_INSTANCE,
        label: "Attack damage disposition",
        attackerId: input.attackerId,
        targetId: input.target.combatantId,
        choices,
      }
    : null;
}

export function zeroHitPointReplacementDispositionHole(input: {
  readonly damageSourceId: CombatantId;
  readonly target: BattleCreatureState;
  readonly damageAmount: number;
  readonly holeKey?: {
    readonly holeId: BattleHoleId;
    readonly holeInstanceKey: HoleInstanceKey;
    readonly label: string;
  };
}): BattleAttackDamageDispositionHole | null {
  const choices: BattleAttackDamageDisposition[] = [
    { kind: "ordinaryDamage" },
    ...zeroHitPointReplacementChoices(input.target, input.damageAmount),
  ];
  return choices.length > 1
    ? {
        kind: "attackDamageDisposition",
        damageOccurrence: { kind: "untrackedDamage" },
        holeId:
          input.holeKey?.holeId ??
          damageDispositionHoleIdForTarget(input.target.combatantId),
        holeInstanceKey:
          input.holeKey?.holeInstanceKey ??
          damageDispositionHoleInstanceForTarget(input.target.combatantId),
        label: input.holeKey?.label ?? "Damage disposition",
        attackerId: input.damageSourceId,
        targetId: input.target.combatantId,
        choices,
      }
    : null;
}

export function attackBurstDamageDispositionHoleKey(
  part: "attack" | "burst",
  targetId: CombatantId,
): {
  readonly holeId: BattleHoleId;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly label: string;
} {
  return {
    holeId: holeId(
      `battle:attack-burst:${part}:damage-disposition:${targetId}`,
    ),
    holeInstanceKey: holeInstanceKey(
      `battle:attack-burst:${part}:damage-disposition:${targetId}`,
    ),
    label:
      part === "attack"
        ? "Attack-burst initial damage disposition"
        : "Attack-burst secondary damage disposition",
  };
}

export function damageDispositionHoleIdForTarget(
  targetId: CombatantId,
): BattleHoleId {
  return holeId(`battle:damage-disposition:${targetId}`);
}

export function damageDispositionHoleInstanceForTarget(
  targetId: CombatantId,
): HoleInstanceKey {
  return holeInstanceKey(`battle:damage-disposition:${targetId}`);
}

type BattleDamageDispositionFill = Extract<
  BattleFill,
  { readonly kind: "attackDamageDisposition" }
>;

export function damageDispositionFillFor(
  fills: readonly BattleDamageDispositionFill[],
  hole: BattleAttackDamageDispositionHole,
): BattleDamageDispositionFill | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

export function damageDispositionFillsValidation(input: {
  readonly holes: readonly BattleAttackDamageDispositionHole[];
  readonly fills: readonly BattleDamageDispositionFill[];
}): string | null {
  const holeIds = new Set(input.holes.map((hole) => hole.holeId));
  if (input.fills.some((fill) => !holeIds.has(fill.holeId))) {
    return "Damage disposition is only valid when damage offers a disposition choice.";
  }
  const invalidFill = input.holes.some((hole) => {
    const fill = damageDispositionFillFor(input.fills, hole);
    return (
      fill !== undefined &&
      !hole.choices.some((choice) =>
        damageDispositionChoicesEqual(choice, fill.value),
      )
    );
  });
  return invalidFill
    ? "Damage disposition must match one of the currently offered choices."
    : null;
}

export function damageDispositionForTarget(
  holes: readonly BattleAttackDamageDispositionHole[],
  fills: readonly BattleDamageDispositionFill[],
  targetId: CombatantId,
): BattleAttackDamageDisposition {
  const hole = holes.find((candidate) => candidate.targetId === targetId);
  return hole === undefined
    ? { kind: "ordinaryDamage" }
    : (damageDispositionFillFor(fills, hole)?.value ?? {
        kind: "ordinaryDamage",
      });
}

export function damageDispositionFillValidation(input: {
  readonly hole: BattleAttackDamageDispositionHole | null;
  readonly filled: boolean;
  readonly value: BattleAttackDamageDisposition;
}): string | null {
  if (input.hole === null) {
    return input.filled
      ? "Damage disposition is only valid when damage offers a disposition choice."
      : null;
  }
  if (!input.filled) {
    return null;
  }
  return input.hole.choices.some((choice) =>
    damageDispositionChoicesEqual(choice, input.value),
  )
    ? null
    : "Damage disposition must match one of the currently offered choices.";
}

export function damageDispositionChoicesEqual(
  a: BattleAttackDamageDisposition,
  b: BattleAttackDamageDisposition,
): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === "zeroHitPointReplacement" &&
    b.kind === "zeroHitPointReplacement"
    ? a.procedureRef === b.procedureRef
    : true;
}

export function zeroHitPointReplacementChoices(
  target: BattleCreatureState,
  damageAmount: number,
): readonly BattleAttackDamageDisposition[] {
  const projection = hpDamageProjection(target, damageAmount);
  if (
    projection.currentHp <= 0 ||
    Number(projection.nextHp) > 0 ||
    projection.massiveDamageKills ||
    target.origin.kind !== "character"
  ) {
    return [];
  }
  return zeroHitPointReplacementCapabilities(target.origin).map(
    (capability) => ({
      kind: "zeroHitPointReplacement" as const,
      procedureRef: capability.procedureRef,
    }),
  );
}

export function attackDamageHoleId(
  attack: SupportedAttackActionOption,
  critical = false,
  attackRoll?: AttackRollResult,
  spellWeaponDamageRiders: readonly SpellAttackDamageComponent[] = [],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
  ongoingDamageModifier = 0,
): BattleHoleId {
  return holeId(
    `battle:attack:damage-result:${weaponAttackDamageExpression(
      attack,
      critical,
      attackRoll,
      [],
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
      ongoingDamageModifier,
    )}`,
  );
}

export function attackActionOptionForSubject(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
): BoundSupportedAttackActionOption | undefined {
  return attackActionOptionsForActor(state, subject.actorId).find((attack) =>
    boundAttackExecutionSelectionMatchesOption(subject, attack),
  );
}

export function attackActionOptionsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly BoundSupportedAttackActionOption[] {
  if (isPresentSpawnedCompanionCombatant(state, actorId)) {
    return [];
  }
  const actor = state.combatants.get(actorId);
  if (isCharacterBattleCreatureState(actor)) {
    const wildShape = activeDruidWildShape(actor);
    if (wildShape !== null) {
      return [
        ...statBlockAttackActionOptions(wildShape.admission.execution).filter(
          (option) =>
            statBlockProcedureResourcesAvailable(
              wildShape.admission.execution,
              option.procedureRef,
            ),
        ),
        ...wildShapeWornWeaponAttackOptions(state, actor, wildShape.effect),
      ].filter((attack) => ammunitionForAttackIsReady(state, actor, attack));
    }
    const unarmedStrike = unarmedStrikeWithActiveSelfTransformationOverride(
      actor,
      actor.origin.unarmedStrike,
    );
    const options = [
      ...mainWeaponAttackOptions(state, actor),
      ...carriedThrownWeaponAttackOptions(state, actor),
      unarmedStrike,
    ];
    return options.filter((attack) =>
      ammunitionForAttackIsReady(state, actor, attack),
    );
  }

  if (actor?.origin.kind === "statBlock") {
    const origin = actor.origin;
    const hasMultiattackContinuation =
      hasStatBlockMultiattackContinuationResource(
        state.currentTurnResources.actionResources,
        actorId,
        origin.execution,
      );
    return statBlockAttackActionOptions(origin.execution).filter(
      (option) =>
        option.procedureRef !== undefined &&
        statBlockProcedureResourcesAvailable(
          origin.execution,
          option.procedureRef,
        ) &&
        (!hasMultiattackContinuation ||
          (option.procedureRef !== undefined &&
            state.currentTurnResources.actionResources.some((resource) =>
              statBlockMultiattackActionResourceMatchesProcedure(
                resource,
                actorId,
                origin.execution,
                option.procedureRef,
              ),
            ))) &&
        ammunitionForAttackIsReady(state, actor, option),
    );
  }

  return [];
}

/** The attacks a character's main weapon can make now. */
function mainWeaponAttackOptions(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly BoundSupportedAttackActionOption[] {
  const main = actor.origin.attack;
  if (main == null) return [];
  const deliveries = loadoutWeaponDeliveries(state, actor, main.weaponObjectId);
  if (deliveries === null) return [];
  return uniqueAttackExecutionSelectionOptions(
    weaponAttackOptionsForActor(
      state,
      actor,
      main,
      mainHandWeaponItemIdForAttack(state, actor, main),
    ).filter(deliveries),
  );
}

/**
 * Which attacks a loadout weapon can make where it is now: every attack while
 * it's in hand, and only its throws while it's sheathed or stowed and a hand
 * is free. SRD 5.2.1 equipment.md "Thrown": "you can draw that weapon as part
 * of the attack", so the draw belongs to the throw, not to the Attack
 * action's one weapon change, and the weapon leaves the hand as it flies. A
 * weapon on the ground is picked up, not drawn, so it makes no attack.
 */
function loadoutWeaponDeliveries(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  weaponObjectId: BattleObjectId,
): ((attack: BoundCharacterWeaponAttackActionOption) => boolean) | null {
  if (loadoutWeaponIsHeld(state, actor.combatantId, weaponObjectId)) {
    return () => true;
  }
  return loadoutWeaponIsStowed(state, actor.combatantId, weaponObjectId) &&
    creatureHasFreeHand(state, actor)
    ? weaponAttackIsThrown
    : null;
}

function creatureHasFreeHand(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): boolean {
  const hands = combatantHandUses(state, actor, state.grapples);
  return hands.left === "free" || hands.right === "free";
}

/**
 * The throws of the weapons a character carries outside its loadout. SRD
 * 5.2.1 equipment.md "Thrown": "you can draw that weapon as part of the
 * attack", so a carried Thrown weapon is drawn into a free hand and thrown
 * without the Attack action's weapon change. One on the ground is picked
 * up, not drawn.
 */
function carriedThrownWeaponAttackOptions(
  state: BattleState,
  actor: CharacterBattleCreatureState,
): readonly BoundSupportedAttackActionOption[] {
  if (!creatureHasFreeHand(state, actor)) return [];
  return actor.origin.otherOwnedWeaponAttacks.flatMap((carried) =>
    battleObjectIsOnGround(state, actor.combatantId, carried.weaponObjectId)
      ? []
      : uniqueAttackExecutionSelectionOptions(
          weaponAttackOptionsForActor(
            state,
            actor,
            carried,
            carried.weaponObjectId,
          ).filter(weaponAttackIsThrown),
        ),
  );
}

function uniqueAttackExecutionSelectionOptions(
  candidates: readonly BoundSupportedAttackActionOption[],
): readonly BoundSupportedAttackActionOption[] {
  const selectionKeys = new Set<string>();
  return candidates.filter((candidate) => {
    const selectionKey = boundAttackExecutionSelectionKey(
      attackExecutionSelectionForOption(candidate),
    );
    if (selectionKeys.has(selectionKey)) return false;
    selectionKeys.add(selectionKey);
    return true;
  });
}

export function offHandAttackActionOptionsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly BoundCharacterWeaponAttackActionOption[] {
  const actor = state.combatants.get(actorId);
  if (!isCharacterBattleCreatureState(actor)) return [];
  const activeWildShapeEffect = activeDruidWildShapeEffect(actor);
  const main = actor.origin.attack;
  const offHand = actor.origin.offHandAttack;
  if (main === null || offHand === undefined) return [];
  // The Light extra attack needs the off-hand weapon in hand, not the main one:
  // a thrown main-hand Dagger has already made the Light attack it follows.
  // A stowed one is drawn as part of its throw.
  const offHandDeliveries = loadoutWeaponDeliveries(
    state,
    actor,
    offHand.weaponObjectId,
  );
  if (offHandDeliveries === null) return [];
  if (
    activeWildShapeEffect !== null &&
    (wildShapeWornLoadoutWeaponObjectForAttack(
      actor,
      activeWildShapeEffect,
      "mainWeapon",
      main,
    ) === undefined ||
      wildShapeWornLoadoutWeaponObjectForAttack(
        actor,
        activeWildShapeEffect,
        "offHandWeapon",
        offHand,
      ) === undefined)
  ) {
    return [];
  }
  if (
    main.kind !== "weapon" ||
    !isLightMeleeWeapon(main.weapon) ||
    !isLightMeleeWeapon(offHand.weapon)
  ) {
    return [];
  }
  const offHandAttack =
    activeWildShapeEffect === null
      ? offHand
      : wildShapeWornWeaponAttackWithFormStatistics(actor, offHand);
  return weaponAttackOptionsForActor(
    state,
    actor,
    offHandAttack,
    offHandWeaponItemIdForAttack(state, actor, offHand),
    {
      kind: "lightExtraAttack",
      procedureRefs:
        characterLightExtraAttackDamageAbilityModifierSupportProcedureRefs(
          actor,
        ),
    },
  )
    .filter(offHandDeliveries)
    .filter((attack) => ammunitionForAttackIsReady(state, actor, attack));
}

function wildShapeWornWeaponAttackOptions(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  effect: NonNullable<ReturnType<typeof activeDruidWildShapeEffect>>,
): readonly BoundCharacterWeaponAttackActionOption[] {
  return [
    ...(actor.origin.attack === null
      ? []
      : wildShapeWornWeaponAttackOption({
          state,
          actor,
          effect,
          objectKind: "mainWeapon",
          attack: actor.origin.attack,
        })),
  ];
}

function wildShapeWornWeaponAttackOption(input: {
  readonly state: BattleState;
  readonly actor: CharacterBattleCreatureState;
  readonly effect: NonNullable<ReturnType<typeof activeDruidWildShapeEffect>>;
  readonly objectKind: Extract<
    WildShapeLoadoutObjectRef["kind"],
    "mainWeapon" | "offHandWeapon"
  >;
  readonly attack: BoundCharacterWeaponAttackActionOption;
}): readonly BoundCharacterWeaponAttackActionOption[] {
  const item = wildShapeWornLoadoutWeaponObjectForAttack(
    input.actor,
    input.effect,
    input.objectKind,
    input.attack,
  );
  // A worn weapon thrown in this form rests on the ground until picked up.
  return item === undefined ||
    battleObjectIsOnGround(input.state, input.actor.combatantId, item.objectId)
    ? []
    : [
        ...weaponAttackOptionsForActor(
          input.state,
          input.actor,
          wildShapeWornWeaponAttackWithFormStatistics(
            input.actor,
            input.attack,
          ),
          item.objectId,
        ),
      ];
}

function wildShapeWornLoadoutWeaponObjectForAttack(
  actor: CharacterBattleCreatureState,
  effect: NonNullable<ReturnType<typeof activeDruidWildShapeEffect>>,
  objectKind: Extract<
    WildShapeLoadoutObjectRef["kind"],
    "mainWeapon" | "offHandWeapon"
  >,
  attack: CharacterWeaponAttackActionOption,
): WildShapeWornLoadoutObjectRef | undefined {
  return wildShapeWornLoadoutObjectForUse({
    loadout: actor.origin.selectedLoadout,
    formLimbs: effect.formLimbs,
    equipmentDisposition: effect.equipmentDisposition,
    objectKind,
    objectId: attack.weaponObjectId,
  });
}

function wildShapeWornWeaponAttackWithFormStatistics(
  actor: CharacterBattleCreatureState,
  attack: BoundCharacterWeaponAttackActionOption,
): BoundCharacterWeaponAttackActionOption;
function wildShapeWornWeaponAttackWithFormStatistics(
  actor: CharacterBattleCreatureState,
  attack: CharacterWeaponAttackActionOption,
): CharacterWeaponAttackActionOption;
function wildShapeWornWeaponAttackWithFormStatistics(
  actor: CharacterBattleCreatureState,
  attack: CharacterWeaponAttackActionOption,
): CharacterWeaponAttackActionOption {
  const projectedAbilityModifier = wildShapeWornWeaponAbilityModifier(
    actor,
    attack.ability,
  );
  return {
    ...attack,
    abilityModifier: projectedAbilityModifier,
    ...(attack.attackBonus === undefined
      ? {}
      : {
          attackBonus: wildShapeWornWeaponAttackBonus({
            originalAttackBonus: attack.attackBonus,
            originalAbilityModifier: attack.abilityModifier,
            projectedAbilityModifier,
          }),
        }),
    ...(attack.damageAbilityModifier === undefined
      ? {}
      : { damageAbilityModifier: projectedAbilityModifier }),
    ...(attack.alternateAbilityChoices === undefined
      ? {}
      : {
          alternateAbilityChoices: wildShapeWornWeaponAlternateAbilityChoices(
            actor,
            attack.alternateAbilityChoices,
          ),
        }),
  };
}

function wildShapeWornWeaponAlternateAbilityChoices(
  actor: CharacterBattleCreatureState,
  choices: ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice>,
): ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice> {
  const [first, ...rest] = choices;
  return [
    wildShapeWornWeaponAbilityChoice(actor, first),
    ...rest.map((choice) => wildShapeWornWeaponAbilityChoice(actor, choice)),
  ];
}

function wildShapeWornWeaponAbilityChoice(
  actor: CharacterBattleCreatureState,
  choice: CharacterWeaponAttackAbilityChoice,
): CharacterWeaponAttackAbilityChoice {
  const projectedAbilityModifier = wildShapeWornWeaponAbilityModifier(
    actor,
    choice.ability,
  );
  return {
    ...choice,
    abilityModifier: projectedAbilityModifier,
    attackBonus: wildShapeWornWeaponAttackBonus({
      originalAttackBonus: choice.attackBonus,
      originalAbilityModifier: choice.abilityModifier,
      projectedAbilityModifier,
    }),
    damageAbilityModifier: projectedAbilityModifier,
  };
}

function wildShapeWornWeaponAbilityModifier(
  actor: CharacterBattleCreatureState,
  ability: CharacterWeaponAttackActionOption["ability"],
): CharacterWeaponAttackActionOption["abilityModifier"] {
  return abilityModifier(combatantD20AbilityModifier(actor, ability));
}

function wildShapeWornWeaponAttackBonus(input: {
  readonly originalAttackBonus: CharacterWeaponAttackAbilityChoice["attackBonus"];
  readonly originalAbilityModifier: CharacterWeaponAttackAbilityChoice["abilityModifier"];
  readonly projectedAbilityModifier: CharacterWeaponAttackAbilityChoice["abilityModifier"];
}): CharacterWeaponAttackAbilityChoice["attackBonus"] {
  return attackBonus(
    Number(input.originalAttackBonus) -
      Number(input.originalAbilityModifier) +
      Number(input.projectedAbilityModifier),
  );
}

function isCharacterBattleCreatureState(
  actor: BattleCreatureState | undefined,
): actor is CharacterBattleCreatureState {
  return actor?.origin.kind === "character";
}

type WeaponAttackAbilityMode =
  | { readonly kind: "ordinary" }
  | {
      readonly kind: "lightExtraAttack";
      readonly procedureRefs: readonly BattleProcedureExecutionRef[];
    };

function weaponAttackOptionsForActor(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  attack: BoundCharacterWeaponAttackActionOption,
  attachedWeaponItemId: BattleObjectId | undefined,
  abilityMode: WeaponAttackAbilityMode = { kind: "ordinary" },
): readonly BoundCharacterWeaponAttackActionOption[] {
  return characterWeaponAttackDeliveryOptions(attack).flatMap((delivery) => {
    const projected = weaponAttackWithActiveSpellEffects(
      state,
      actor,
      weaponAttackWithMeleeGripAndMartialArtsDamage(state, actor, delivery),
      attachedWeaponItemId,
    );
    const withAbilityMode = Match.value(abilityMode).pipe(
      Match.when({ kind: "ordinary" }, () => projected),
      Match.when({ kind: "lightExtraAttack" }, ({ procedureRefs }) =>
        lightExtraAttackWithAbilityChoices(projected, procedureRefs),
      ),
      Match.exhaustive,
    );
    return attackAbilityAndDamageTypeOptions(withAbilityMode);
  });
}

function lightExtraAttackWithAbilityChoices(
  attack: BoundCharacterWeaponAttackActionOption,
  procedureRefs: readonly BattleProcedureExecutionRef[],
): BoundCharacterWeaponAttackActionOption {
  const { attackDamageAbilityModifierChoice: _choice, ...withoutChoice } =
    attack;
  return {
    ...withoutChoice,
    damageAbilityModifier: lightPropertyDamageAbilityModifierForAttack(
      attack,
      procedureRefs.length > 0,
    ),
    ...lightPropertyAttackDamageAbilityModifierChoice(attack, procedureRefs),
    ...(attack.alternateAbilityChoices === undefined
      ? {}
      : {
          alternateAbilityChoices: lightPropertyAlternateAbilityChoices(
            attack.alternateAbilityChoices,
            procedureRefs,
          ),
        }),
  };
}

function weaponAttackWithMeleeGripAndMartialArtsDamage(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  attack: BoundCharacterWeaponAttackActionOption,
): BoundCharacterWeaponAttackActionOption {
  const gripDamage = meleeGripDamageForAttack(state, actor, attack);
  const martialArts = martialArtsWeaponDamageReplacement(state, actor, attack);
  const damage =
    martialArts === undefined
      ? gripDamage
      : weaponDamageWithMartialArtsDie(gripDamage, martialArts);
  return damage === attack.weapon.damage
    ? attack
    : { ...attack, weapon: { ...attack.weapon, damage } };
}

function meleeGripDamageForAttack(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  attack: BoundCharacterWeaponAttackActionOption,
): CharacterWeaponAttackActionOption["weapon"]["damage"] {
  if (
    attack.weaponDelivery !== undefined ||
    attack.weapon.usage !== "melee" ||
    attack.meleeGripDamage === undefined
  )
    return attack.weapon.damage;
  const mainWeapon = characterEffectiveLoadoutFromOrigin(
    state,
    actor.combatantId,
    actor.origin,
  ).weapon;
  return mainWeapon?.itemId === attack.weaponObjectId &&
    mainWeapon.grip === "two_handed"
    ? attack.meleeGripDamage.damage
    : attack.weapon.damage;
}

function martialArtsWeaponDamageReplacement(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  attack: BoundCharacterWeaponAttackActionOption,
):
  | NonNullable<
      ReturnType<typeof martialArtsAttackProjectionForActor>
    >["damageReplacement"]
  | undefined {
  const profile = martialArtsAttackProjectionForActor(actor);
  return profile !== undefined &&
    isMonkWeapon(attack.weapon) &&
    martialArtsLoadoutEligible(state, actor.combatantId, actor.origin)
    ? profile.damageReplacement
    : undefined;
}

function weaponDamageWithMartialArtsDie(
  damage: CharacterWeaponAttackActionOption["weapon"]["damage"],
  replacement: NonNullable<
    ReturnType<typeof martialArtsWeaponDamageReplacement>
  >,
): CharacterWeaponAttackActionOption["weapon"]["damage"] {
  return damage.kind === "dice" &&
    damage.dice === 1 &&
    damage.dieSize < replacement.dieSize
    ? { ...damage, dice: replacement.dice, dieSize: replacement.dieSize }
    : damage;
}

function weaponAttackWithActiveSpellEffects(
  state: BattleState,
  actor: BattleCreatureState,
  attack: BoundCharacterWeaponAttackActionOption,
  attachedWeaponItemId: BattleObjectId | undefined,
): BoundCharacterWeaponAttackActionOption;
function weaponAttackWithActiveSpellEffects(
  state: BattleState,
  actor: BattleCreatureState,
  attack: CharacterWeaponAttackActionOption,
  attachedWeaponItemId: BattleObjectId | undefined,
): CharacterWeaponAttackActionOption;
function weaponAttackWithActiveSpellEffects(
  state: BattleState,
  actor: BattleCreatureState,
  attack: CharacterWeaponAttackActionOption,
  attachedWeaponItemId: BattleObjectId | undefined,
): CharacterWeaponAttackActionOption {
  return weaponAttackWithWeaponAttackDamageEnhancement(
    state,
    actor.combatantId,
    weaponAttackWithActiveSacredWeapon(
      actor,
      weaponAttackWithActiveSpellOverride(actor, attack, attachedWeaponItemId),
      attachedWeaponItemId,
    ),
    attachedWeaponItemId,
  );
}

function weaponAttackWithActiveSacredWeapon(
  actor: BattleCreatureState,
  attack: BoundCharacterWeaponAttackActionOption,
  attachedWeaponItemId: BattleObjectId | undefined,
): BoundCharacterWeaponAttackActionOption;
function weaponAttackWithActiveSacredWeapon(
  actor: BattleCreatureState,
  attack: CharacterWeaponAttackActionOption,
  attachedWeaponItemId: BattleObjectId | undefined,
): CharacterWeaponAttackActionOption;
function weaponAttackWithActiveSacredWeapon(
  actor: BattleCreatureState,
  attack: CharacterWeaponAttackActionOption,
  attachedWeaponItemId: BattleObjectId | undefined,
): CharacterWeaponAttackActionOption {
  if (
    actor.origin.kind !== "character" ||
    attachedWeaponItemId === undefined ||
    attack.weapon.damage.kind !== "dice"
  ) {
    return attack;
  }
  const effect = actor.activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "paladinSacredWeapon" }
    > =>
      candidate.kind === "paladinSacredWeapon" &&
      candidate.sourceCombatantId === actor.combatantId &&
      candidate.weaponItemId === attachedWeaponItemId,
  );
  if (effect === undefined) {
    return attack;
  }
  const procedure = characterUnitProcedure(
    actor.origin.execution,
    effect.sourceProcedureRef,
    CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY,
  );
  const profile =
    procedure?.kind === "unitFeature" &&
    procedure.execution.kind === "paladinSacredWeapon"
      ? procedure.execution
      : undefined;
  if (profile === undefined) {
    return attack;
  }
  const sacredWeaponAttackBonus = Math.max(
    profile.sacredWeapon.attackRollBonus.minimum,
    scoreModifier(actor.origin.d20Statistics.abilityScores.cha),
  );
  return {
    ...attack,
    attackBonus: attackBonus(
      Number(
        attack.attackBonus ?? attackBonus(Number(attack.abilityModifier)),
      ) + sacredWeaponAttackBonus,
    ),
    ...(attack.alternateAbilityChoices === undefined
      ? {}
      : {
          alternateAbilityChoices: sacredWeaponAbilityChoices(
            attack.alternateAbilityChoices,
            sacredWeaponAttackBonus,
          ),
        }),
    ...(profile.sacredWeapon.hitDamageTypeChoice.includes("radiant") &&
    attack.weapon.damage.damageType !== "radiant"
      ? {
          damageTypeChoices: [
            attack.weapon.damage.damageType,
            "radiant",
          ] as const,
        }
      : {}),
  };
}

function sacredWeaponAbilityChoices(
  choices: ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice>,
  sacredWeaponAttackBonus: number,
): ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice> {
  const [first, ...rest] = choices;
  return [
    sacredWeaponAbilityChoice(first, sacredWeaponAttackBonus),
    ...rest.map((choice) =>
      sacredWeaponAbilityChoice(choice, sacredWeaponAttackBonus),
    ),
  ];
}

function sacredWeaponAbilityChoice(
  choice: CharacterWeaponAttackAbilityChoice,
  sacredWeaponAttackBonus: number,
): CharacterWeaponAttackAbilityChoice {
  return {
    ...choice,
    attackBonus: attackBonus(
      Number(choice.attackBonus) + sacredWeaponAttackBonus,
    ),
  };
}

function weaponAttackWithActiveSpellOverride(
  actor: BattleCreatureState,
  attack: BoundCharacterWeaponAttackActionOption,
  attachedWeaponItemId: BattleObjectId | undefined,
): BoundCharacterWeaponAttackActionOption;
function weaponAttackWithActiveSpellOverride(
  actor: BattleCreatureState,
  attack: CharacterWeaponAttackActionOption,
  attachedWeaponItemId: BattleObjectId | undefined,
): CharacterWeaponAttackActionOption;
function weaponAttackWithActiveSpellOverride(
  actor: BattleCreatureState,
  attack: CharacterWeaponAttackActionOption,
  attachedWeaponItemId: BattleObjectId | undefined,
): CharacterWeaponAttackActionOption {
  if (
    attachedWeaponItemId === undefined ||
    !weaponAttackCanUseActiveSpellOverride(attack)
  ) {
    return attack;
  }
  const effect = activeSpellWeaponAttackOverrideEffectForWeapon(
    actor,
    attachedWeaponItemId,
  );
  if (effect === undefined) {
    return attack;
  }
  return {
    ...attack,
    abilityModifier: effect.spellcastingAbilityModifier,
    attackBonus: effect.attackBonus,
    damageAbilityModifier: effect.spellcastingAbilityModifier,
    damageTypeChoices: effect.damageTypeChoices,
    alternateAbilityChoices: [
      {
        ability: attack.ability,
        abilityModifier: attack.abilityModifier,
        attackBonus:
          attack.attackBonus ?? attackBonus(Number(attack.abilityModifier)),
        damageAbilityModifier:
          attack.damageAbilityModifier ?? attack.abilityModifier,
      },
      ...(attack.alternateAbilityChoices ?? []),
    ],
    weapon: {
      ...attack.weapon,
      damage: {
        ...attack.weapon.damage,
        dice: effect.damage.expr.dice,
        dieSize: effect.damage.expr.dieSize,
      },
    },
  };
}

export function weaponAttackUsesActiveSpellOverride(
  state: BattleState,
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
): boolean {
  const actor = state.combatants.get(actorId);
  if (actor === undefined || attack.kind !== "weapon") {
    return false;
  }
  const attachedWeaponItemId = heldWeaponItemIdForAttack(
    state,
    actorId,
    attack,
  );
  if (
    attachedWeaponItemId === undefined ||
    !weaponAttackCanUseActiveSpellOverride(attack)
  ) {
    return false;
  }
  return (
    activeSpellWeaponAttackOverrideEffectForWeapon(
      actor,
      attachedWeaponItemId,
    ) !== undefined
  );
}

type SpellWeaponAttackOverrideShape = CharacterWeaponAttackActionOption & {
  readonly weapon: CharacterWeaponAttackActionOption["weapon"] & {
    readonly damage: Extract<
      CharacterWeaponAttackActionOption["weapon"]["damage"],
      { readonly kind: "dice" }
    >;
    readonly usage: "melee";
  };
};

function weaponAttackCanUseActiveSpellOverride(
  attack: CharacterWeaponAttackActionOption,
): attack is SpellWeaponAttackOverrideShape {
  return (
    attack.weapon.damage.kind === "dice" && attack.weapon.usage === "melee"
  );
}

function activeSpellWeaponAttackOverrideEffectForWeapon(
  actor: BattleCreatureState,
  attachedWeaponItemId: BattleObjectId,
):
  | Extract<BattleActiveEffect, { readonly kind: "spellWeaponAttackOverride" }>
  | undefined {
  return actor.activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "spellWeaponAttackOverride" }
    > =>
      isSpellWeaponAttackOverrideEffect(candidate) &&
      candidate.sourceCombatantId === actor.combatantId &&
      candidate.weaponItemId === attachedWeaponItemId,
  );
}

function weaponAttackWithWeaponAttackDamageEnhancement(
  state: BattleState,
  holderCombatantId: CombatantId,
  attack: BoundCharacterWeaponAttackActionOption,
  attachedWeaponItemId: BattleObjectId | undefined,
): BoundCharacterWeaponAttackActionOption;
function weaponAttackWithWeaponAttackDamageEnhancement(
  state: BattleState,
  holderCombatantId: CombatantId,
  attack: CharacterWeaponAttackActionOption,
  attachedWeaponItemId: BattleObjectId | undefined,
): CharacterWeaponAttackActionOption;
function weaponAttackWithWeaponAttackDamageEnhancement(
  state: BattleState,
  holderCombatantId: CombatantId,
  attack: CharacterWeaponAttackActionOption,
  attachedWeaponItemId: BattleObjectId | undefined,
): CharacterWeaponAttackActionOption {
  if (attachedWeaponItemId === undefined) {
    return attack;
  }
  const bonus = battleWeaponItemWeaponAttackDamageEnhancementBonus(
    state,
    holderCombatantId,
    attachedWeaponItemId,
  );
  if (bonus === null) {
    return attack;
  }
  return {
    ...attack,
    attackBonus: attackBonus(
      Number(
        attack.attackBonus ?? attackBonus(Number(attack.abilityModifier)),
      ) + bonus,
    ),
    damageBonus: (attack.damageBonus ?? 0) + bonus,
    ...(attack.alternateAbilityChoices === undefined
      ? {}
      : {
          alternateAbilityChoices: enhancedWeaponAlternateAbilityChoices(
            attack.alternateAbilityChoices,
            bonus,
          ),
        }),
  };
}

function enhancedWeaponAlternateAbilityChoices(
  choices: ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice>,
  bonus: WeaponAttackDamageEnhancementBonus,
): ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice> {
  const [first, ...rest] = choices;
  return [
    enhancedWeaponAbilityChoice(first, bonus),
    ...rest.map((choice) => enhancedWeaponAbilityChoice(choice, bonus)),
  ];
}

function enhancedWeaponAbilityChoice(
  choice: CharacterWeaponAttackAbilityChoice,
  bonus: WeaponAttackDamageEnhancementBonus,
): CharacterWeaponAttackAbilityChoice {
  return {
    ...choice,
    attackBonus: attackBonus(Number(choice.attackBonus) + bonus),
  };
}

function isSpellWeaponAttackOverrideEffect(
  effect: BattleActiveEffect,
): effect is Extract<
  BattleActiveEffect,
  { readonly kind: "spellWeaponAttackOverride" }
> {
  return effect.kind === "spellWeaponAttackOverride";
}

type WeaponAttackDamageEnhancementEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "weaponAttackDamageEnhancement" }
>;

type WeaponAttackDamageEnhancementExclusion = {
  readonly exceptSourceCombatantId?: CombatantId;
  readonly exceptSourceProcedureRef?: BattleProcedureExecutionRef;
};

export function battleWeaponItemHasWeaponAttackDamageEnhancement(
  state: BattleState,
  holderCombatantId: CombatantId,
  weaponItemId: BattleObjectId,
  exclusion: WeaponAttackDamageEnhancementExclusion = {},
): boolean {
  return (
    battleWeaponItemWeaponAttackDamageEnhancementBonus(
      state,
      holderCombatantId,
      weaponItemId,
      exclusion,
    ) !== null
  );
}

export function battleWeaponItemWeaponAttackDamageEnhancementBonus(
  state: BattleState,
  holderCombatantId: CombatantId,
  weaponItemId: BattleObjectId,
  exclusion: WeaponAttackDamageEnhancementExclusion = {},
): WeaponAttackDamageEnhancementBonus | null {
  const bonuses = [...state.combatants.values()].flatMap((combatant) =>
    combatant.activeEffects.flatMap((effect) => {
      if (
        !isWeaponAttackDamageEnhancementEffect(effect) ||
        effect.holderCombatantId !== holderCombatantId ||
        effect.weaponItemId !== weaponItemId ||
        weaponAttackDamageEnhancementEffectExcluded(effect, exclusion)
      ) {
        return [];
      }
      const bonus = weaponAttackDamageEnhancementBonus(state, effect);
      return bonus === undefined ? [] : [bonus];
    }),
  );
  return bonuses.reduce<WeaponAttackDamageEnhancementBonus | null>(
    (highest, bonus) => (highest === null || bonus > highest ? bonus : highest),
    null,
  );
}

function isWeaponAttackDamageEnhancementEffect(
  effect: BattleActiveEffect,
): effect is WeaponAttackDamageEnhancementEffect {
  return effect.kind === "weaponAttackDamageEnhancement";
}

function weaponAttackDamageEnhancementEffectExcluded(
  effect: WeaponAttackDamageEnhancementEffect,
  exclusion: WeaponAttackDamageEnhancementExclusion,
): boolean {
  return (
    exclusion.exceptSourceCombatantId !== undefined &&
    effect.sourceCombatantId === exclusion.exceptSourceCombatantId &&
    (exclusion.exceptSourceProcedureRef === undefined ||
      effect.sourceProcedureRef === exclusion.exceptSourceProcedureRef)
  );
}

function mainHandWeaponItemIdForAttack(
  state: BattleState,
  actor: BattleCreatureState,
  attack: CharacterWeaponAttackActionOption,
): BattleObjectId | undefined {
  if (
    actor.origin.kind !== "character" ||
    actor.origin.attack?.kind !== "weapon" ||
    actor.origin.attack !== attack
  ) {
    return undefined;
  }
  const mainHandWeapon = characterEffectiveLoadoutFromOrigin(
    state,
    actor.combatantId,
    actor.origin,
  ).weapon;
  return mainHandWeapon !== undefined &&
    mainHandWeapon.itemId === attack.weaponObjectId
    ? mainHandWeapon.itemId
    : undefined;
}

function offHandWeaponItemIdForAttack(
  state: BattleState,
  actor: BattleCreatureState,
  attack: CharacterWeaponAttackActionOption,
): BattleObjectId | undefined {
  if (
    !isCharacterBattleCreatureState(actor) ||
    actor.origin.offHandAttack !== attack
  ) {
    return undefined;
  }
  return offHandLoadoutWeaponItemId(state, actor, attack.weaponObjectId);
}

/**
 * The off-hand weapon's battle object when it is the given weapon, in hand
 * or sheathed: a stowed off-hand weapon is drawn as part of its throw.
 */
function offHandLoadoutWeaponItemId(
  state: BattleState,
  actor: CharacterBattleCreatureState,
  weaponObjectId: BattleObjectId,
): BattleObjectId | undefined {
  const offHandWeapon = characterEffectiveLoadoutFromOrigin(
    state,
    actor.combatantId,
    actor.origin,
  ).offHandWeapon;
  if (offHandWeapon?.itemId === weaponObjectId) return offHandWeapon.itemId;
  return actor.origin.selectedLoadout.offHandWeapon?.itemId ===
    weaponObjectId &&
    loadoutWeaponIsStowed(state, actor.combatantId, weaponObjectId)
    ? weaponObjectId
    : undefined;
}

function lightPropertyAlternateAbilityChoices(
  choices: ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice>,
  twoWeaponFightingSupportProcedureRefs: readonly BattleProcedureExecutionRef[],
): ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice> {
  const [first, ...rest] = choices;
  return [
    lightPropertyAbilityChoice(first, twoWeaponFightingSupportProcedureRefs),
    ...rest.map((choice) =>
      lightPropertyAbilityChoice(choice, twoWeaponFightingSupportProcedureRefs),
    ),
  ];
}

function lightPropertyAbilityChoice(
  choice: CharacterWeaponAttackAbilityChoice,
  twoWeaponFightingSupportProcedureRefs: readonly BattleProcedureExecutionRef[],
): CharacterWeaponAttackAbilityChoice {
  const {
    attackDamageAbilityModifierChoice: _choiceDamageAbilityModifierChoice,
    ...choiceWithoutDamageAbilityModifierChoice
  } = choice;
  return {
    ...choiceWithoutDamageAbilityModifierChoice,
    damageAbilityModifier:
      lightPropertyDamageAbilityModifierForAbilityChoice(choice),
    ...lightPropertyAttackDamageAbilityModifierChoiceForAbilityChoice(
      choice,
      twoWeaponFightingSupportProcedureRefs,
    ),
  };
}

function lightPropertyDamageAbilityModifierForAbilityChoice(
  choice: CharacterWeaponAttackAbilityChoice,
): AbilityModifier {
  return choice.damageAbilityModifier < 0
    ? choice.damageAbilityModifier
    : abilityModifier(0);
}

function lightPropertyDamageAbilityModifierForAttack(
  attack: CharacterWeaponAttackActionOption,
  hasTwoWeaponFightingSupport: boolean,
): AbilityModifier {
  return lightPropertyDamageAbilityModifier({
    abilityModifier: attack.abilityModifier,
    damageAbilityModifier: attack.damageAbilityModifier,
    hasTwoWeaponFightingSupport,
  });
}

function lightPropertyDamageAbilityModifier(input: {
  readonly abilityModifier: AbilityModifier;
  readonly damageAbilityModifier: AbilityModifier | undefined;
  readonly hasTwoWeaponFightingSupport: boolean;
}): AbilityModifier {
  if (
    input.hasTwoWeaponFightingSupport &&
    input.damageAbilityModifier !== undefined
  ) {
    return input.damageAbilityModifier;
  }
  const damageAbilityModifier =
    input.damageAbilityModifier ?? input.abilityModifier;
  return damageAbilityModifier < 0 ? damageAbilityModifier : abilityModifier(0);
}

function lightPropertyAttackDamageAbilityModifierChoice(
  attack: CharacterWeaponAttackActionOption,
  procedureRefs: readonly BattleProcedureExecutionRef[],
): Pick<
  CharacterWeaponAttackActionOption,
  "attackDamageAbilityModifierChoice"
> {
  const nonEmptyProcedureRefs =
    attackDamageAbilityModifierChoiceProcedureRefs(procedureRefs);
  if (
    nonEmptyProcedureRefs === null ||
    attack.damageAbilityModifier !== undefined ||
    attack.abilityModifier <= 0
  ) {
    return {};
  }
  return {
    attackDamageAbilityModifierChoice: {
      procedureRefs: nonEmptyProcedureRefs,
      appliedDamageAbilityModifier: attack.abilityModifier,
      declinedDamageAbilityModifier: abilityModifier(0),
    },
  };
}

function lightPropertyAttackDamageAbilityModifierChoiceForAbilityChoice(
  choice: CharacterWeaponAttackAbilityChoice,
  procedureRefs: readonly BattleProcedureExecutionRef[],
): Pick<
  CharacterWeaponAttackAbilityChoice,
  "attackDamageAbilityModifierChoice"
> {
  const nonEmptyProcedureRefs =
    attackDamageAbilityModifierChoiceProcedureRefs(procedureRefs);
  if (nonEmptyProcedureRefs === null || choice.damageAbilityModifier <= 0) {
    return {};
  }
  return {
    attackDamageAbilityModifierChoice: {
      procedureRefs: nonEmptyProcedureRefs,
      appliedDamageAbilityModifier: choice.damageAbilityModifier,
      declinedDamageAbilityModifier: abilityModifier(0),
    },
  };
}

function characterLightExtraAttackDamageAbilityModifierSupportProcedureRefs(
  actor: CharacterBattleCreatureState,
): readonly BattleProcedureExecutionRef[] {
  return actor.origin.execution.procedureBindings.flatMap((binding) =>
    (binding.procedure.kind === "unitFeature" ||
      binding.procedure.kind === "unitSupportProfile") &&
    typeof binding.procedure.execution === "object" &&
    binding.procedure.execution.kind ===
      LIGHT_EXTRA_ATTACK_DAMAGE_ABILITY_MODIFIER_SUPPORT_PROFILE
      ? [binding.procedureRef]
      : [],
  );
}

export function martialArtsBonusUnarmedStrikeActionOptionForActor(
  state: BattleState,
  actorId: CombatantId,
): BoundCharacterUnarmedStrikeActionOption | undefined {
  const actor = state.combatants.get(actorId);
  if (
    actor === undefined ||
    actor.origin.kind !== "character" ||
    martialArtsAttackProjectionForActor(actor) === undefined ||
    !martialArtsLoadoutEligible(state, actor.combatantId, actor.origin)
  ) {
    return undefined;
  }
  return unarmedStrikeWithActiveSelfTransformationOverride(
    actor,
    actor.origin.unarmedStrike,
  );
}

function unarmedStrikeWithActiveSelfTransformationOverride(
  actor: BattleCreatureState,
  unarmedStrike: BoundCharacterUnarmedStrikeActionOption,
): BoundCharacterUnarmedStrikeActionOption;
function unarmedStrikeWithActiveSelfTransformationOverride(
  actor: BattleCreatureState,
  unarmedStrike: CharacterUnarmedStrikeActionOption,
): CharacterUnarmedStrikeActionOption;
function unarmedStrikeWithActiveSelfTransformationOverride(
  actor: BattleCreatureState,
  unarmedStrike: CharacterUnarmedStrikeActionOption,
): CharacterUnarmedStrikeActionOption {
  const effect = activeSelfTransformationNaturalWeaponsEffect(actor);
  if (effect === undefined) {
    return unarmedStrike;
  }
  return {
    ...unarmedStrike,
    effect: {
      kind: "damage",
      damage: {
        kind: "procedureReplacement",
        sourceProcedureRef: effect.sourceProcedureRef,
        dice: effect.naturalWeaponFacts.damage.dice,
        dieSize: effect.naturalWeaponFacts.damage.dieSize,
        damageType: effect.naturalWeaponDamageType,
      },
    },
    attackAbility: "spellcasting",
    attackAbilityModifier:
      effect.naturalWeaponFacts.spellcastingAbilityModifier,
    attackBonus: effect.naturalWeaponFacts.attackBonus,
    damageAbilityModifier:
      effect.naturalWeaponFacts.spellcastingAbilityModifier,
  };
}

export function offHandAttackPrerequisiteMet(
  state: BattleState,
  actorId: CombatantId,
  offHand: CharacterWeaponAttackActionOption,
): boolean {
  const offHandItemId = offHandWeaponItemIdForActor(state, actorId, offHand);
  if (offHandItemId === undefined) return false;
  const priorLightAttack = state.currentTurnResources.lightWeaponAttackMade;
  return (
    priorLightAttack !== undefined &&
    priorLightAttack.weaponItemId !== offHandItemId
  );
}

export function heldWeaponItemIdForAttack(
  state: BattleState,
  actorId: CombatantId,
  attack: CharacterWeaponAttackActionOption,
): BattleObjectId {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return attack.weaponObjectId;
  const loadout = characterEffectiveLoadoutFromOrigin(
    state,
    actor.combatantId,
    actor.origin,
  );
  const mainWeapon = loadout.weapon;
  if (mainWeapon !== undefined && mainWeapon.itemId === attack.weaponObjectId) {
    return mainWeapon.itemId;
  }
  const offHandWeapon = loadout.offHandWeapon;
  if (
    offHandWeapon !== undefined &&
    offHandWeapon.itemId === attack.weaponObjectId
  ) {
    return offHandWeapon.itemId;
  }
  return attack.weaponObjectId;
}

export function offHandWeaponItemIdForActor(
  state: BattleState,
  actorId: CombatantId,
  offHand: CharacterWeaponAttackActionOption,
): BattleObjectId | undefined {
  const actor = state.combatants.get(actorId);
  if (!isCharacterBattleCreatureState(actor)) return undefined;
  return offHandLoadoutWeaponItemId(state, actor, offHand.weaponObjectId);
}

export function isLightMeleeWeapon(
  weapon: CharacterWeaponAttackActionOption["weapon"],
): boolean {
  return (
    weapon.usage === "melee" &&
    weapon.properties.some((property) => property.kind === "light")
  );
}

function martialArtsAttackProjectionForActor(
  actor: BattleCreatureState,
):
  | Extract<
      UnitFeatureProcedureExecution,
      { readonly kind: "martialArtsAttackProjection" }
    >["martialArts"]
  | undefined {
  if (actor.origin.kind !== "character") return undefined;
  for (const binding of actor.origin.execution.procedureBindings) {
    const procedure = binding.procedure;
    if (
      procedure.kind === "unitFeature" &&
      procedure.execution.kind ===
        MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE
    )
      return procedure.execution.martialArts;
  }
  return undefined;
}

function martialArtsLoadoutEligible(
  state: BattleState,
  actorId: CombatantId,
  origin: CharacterBattleCreatureState["origin"],
): boolean {
  const loadout = characterEffectiveLoadoutFromOrigin(state, actorId, origin);
  if (loadout.armor !== undefined || loadout.shield !== undefined) {
    return false;
  }
  const mainWeaponEligible =
    loadout.weapon === undefined ||
    (origin.attack !== null &&
      loadout.weapon.itemId === origin.attack.weaponObjectId &&
      isMonkWeapon(origin.attack.weapon));
  const offHandWeaponEligible =
    loadout.offHandWeapon === undefined ||
    (origin.offHandAttack !== undefined &&
      loadout.offHandWeapon.itemId === origin.offHandAttack.weaponObjectId &&
      isMonkWeapon(origin.offHandAttack.weapon));
  return mainWeaponEligible && offHandWeaponEligible;
}
// KERNEL-COVERAGE: runtime-owner BATTLE.EQUIPMENT.AMMUNITION_LIFECYCLE
