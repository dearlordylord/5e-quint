// Attack damage hole/disposition helpers extracted from battle-reducer.ts.
// Cluster U (attack_damage_apply). Mechanical extraction — no behavior change.
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.martial-arts-attack-projection spell.invocation-weapon-attack-override spell.invocation-self-transformation-mode
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.ATTACK_BRANCHES BATTLE.DAMAGE.DISPOSITION_AND_ZERO_HP

import {
  abilityModifier,
  attackBonus,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import {
  holeId,
  holeInstanceKey,
  type AttackRollResult,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { isMonkWeapon } from "@dnd/shared-algebras/martial-arts-algebra";
import type { HoleInstanceKey } from "@dnd/shared-algebras/runtime-hole-algebra";
import type { UnitRecord, WeaponRecord } from "@dnd/surface/surface/types";
import type { CombatantId } from "../identity.ts";
import type { BattleSubject } from "../battle-subjects.ts";
import { isPresentFindFamiliarCombatant } from "../find-familiar-state.ts";
import type {
  CharacterWeaponAttackAbilityChoice,
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackActionOption,
  SupportedAttackActionOption,
} from "../battle-action-options.ts";
import { MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE } from "../unit-feature-support.ts";
import {
  ATTACK_DAMAGE_DISPOSITION_HOLE_ID,
  ATTACK_DAMAGE_DISPOSITION_HOLE_INSTANCE,
  isStatBlockMultiattackActionResource,
  type AttackDamageRider,
  type BattleAttackDamageDisposition,
  type BattleActiveEffect,
  type BattleAttackDamageDispositionHole,
  type BattleCreatureState,
  type BattleDamageRollHole,
  type BattleFill,
  type BattleHoleId,
  type BattleState,
  type SpellMarkedDamageRider,
  type SpellAttackDamageComponent,
  type StatBlockMultiattackActionResource,
} from "../battle-reducer.ts";
import {
  damageAllowsKnockOut,
  hpDamageProjection,
  zeroHitPointReplacementResource,
} from "./damage-apply.ts";
import {
  attackActionOptionName,
  attackActionVariantOptions,
  attackCanCarryKnockOutChoice,
  weaponAttackDamageExpression,
} from "./statblock-attacks.ts";
import { activeSelfTransformationNaturalWeaponsEffect } from "./spells-active-effects.ts";
import {
  statBlockAttackActionOptions,
  statBlockAttackResourceAvailable,
  statBlockSectionMatchesSubject,
} from "./statblock.ts";

export function attackDamageHole(
  attack: SupportedAttackActionOption,
  critical = false,
  attackRoll?: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[] = [],
  spellWeaponDamageRiders: readonly SpellAttackDamageComponent[] = [],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
  ongoingDamageModifier = 0,
  weaponDamageDiceRollChoiceUnitIds: readonly UnitRecord["id"][] = [],
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
    attack,
    critical,
    ...(attackDamageRiders.length === 0 ? {} : { attackDamageRiders }),
    ...(spellWeaponDamageRiders.length === 0
      ? {}
      : { spellWeaponDamageRiders }),
    ...(spellMarkedDamageRiders.length === 0
      ? {}
      : { spellMarkedDamageRiders }),
    ...(weaponDamageDiceRollChoiceUnitIds.length === 0
      ? {}
      : { weaponDamageDiceRollChoiceUnitIds }),
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

export function iceKnifeDamageDispositionHoleKey(
  part: "attack" | "burst",
  targetId: CombatantId,
): {
  readonly holeId: BattleHoleId;
  readonly holeInstanceKey: HoleInstanceKey;
  readonly label: string;
} {
  return {
    holeId: holeId(`battle:ice-knife:${part}:damage-disposition:${targetId}`),
    holeInstanceKey: holeInstanceKey(
      `battle:ice-knife:${part}:damage-disposition:${targetId}`,
    ),
    label:
      part === "attack"
        ? "Ice Knife attack damage disposition"
        : "Ice Knife burst damage disposition",
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
    ? a.unitId === b.unitId
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
  return target.origin.resources.flatMap((resource) =>
    zeroHitPointReplacementResource(target, resource.unit.id) === null
      ? []
      : [{ kind: "zeroHitPointReplacement", unitId: resource.unit.id }],
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
): SupportedAttackActionOption | undefined {
  return attackActionOptionsForActor(state, subject.actorId).find(
    (attack) =>
      attackActionOptionName(attack) === subject.attackName &&
      statBlockSectionMatchesSubject(attack, subject.statBlockSection),
  );
}

export function attackActionOptionsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly SupportedAttackActionOption[] {
  if (isPresentFindFamiliarCombatant(state, actorId)) {
    return [];
  }
  const actor = state.combatants.get(actorId);
  if (actor !== undefined && actor.origin.kind === "character") {
    const unarmedStrike = unarmedStrikeWithActiveSelfTransformationOverride(
      actor,
      actor.origin.unarmedStrike,
    );
    return actor.origin.attack == null
      ? [unarmedStrike]
      : [
          ...attackActionVariantOptions(
            weaponAttackWithActiveSpellOverride(
              actor,
              actor.origin.attack,
              mainHandWeaponItemIdForAttack(actor, actor.origin.attack),
            ),
          ),
          unarmedStrike,
        ];
  }

  if (actor?.origin.kind === "statBlock") {
    const origin = actor.origin;
    const multiattackResources =
      state.currentTurnResources.actionResources.filter(
        (resource): resource is StatBlockMultiattackActionResource =>
          isStatBlockMultiattackActionResource(resource, actorId),
      );
    const multiattackAttackNames = multiattackResources.map(
      (resource) => resource.attackPart.name,
    );
    return statBlockAttackActionOptions(origin.statBlock).filter(
      (option) =>
        statBlockAttackResourceAvailable(
          origin.statBlock.statBlock,
          origin.resources,
          option,
        ) &&
        (multiattackAttackNames.length === 0 ||
          multiattackAttackNames.includes(option.attack.name)),
    );
  }

  return [];
}

export function offHandAttackActionOptionForActor(
  state: BattleState,
  actorId: CombatantId,
): CharacterWeaponAttackActionOption | undefined {
  return offHandAttackActionOptionsForActor(state, actorId)[0];
}

export function offHandAttackActionOptionsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly CharacterWeaponAttackActionOption[] {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return [];
  const main = actor.origin.attack;
  const offHand = actor.origin.offHandAttack;
  if (main === null || offHand === undefined) return [];
  if (
    main.kind !== "weapon" ||
    !isLightMeleeWeapon(main.weapon) ||
    !isLightMeleeWeapon(offHand.weapon)
  ) {
    return [];
  }
  const projectedOffHand = weaponAttackWithActiveSpellOverride(
    actor,
    offHand,
    offHandWeaponItemIdForAttack(actor, offHand),
  );
  const lightPropertyOffHand = {
    ...projectedOffHand,
    damageAbilityModifier:
      projectedOffHand.abilityModifier < 0
        ? projectedOffHand.abilityModifier
        : abilityModifier(0),
    ...(projectedOffHand.alternateAbilityChoices === undefined
      ? {}
      : {
          alternateAbilityChoices: lightPropertyAlternateAbilityChoices(
            projectedOffHand.alternateAbilityChoices,
          ),
        }),
  };
  return attackActionVariantOptions(lightPropertyOffHand).filter(
    (attack): attack is CharacterWeaponAttackActionOption =>
      attack.kind === "weapon",
  );
}

function weaponAttackWithActiveSpellOverride(
  actor: BattleCreatureState,
  attack: CharacterWeaponAttackActionOption,
  attachedWeaponItemId: string | undefined,
): CharacterWeaponAttackActionOption {
  const effect = actor.activeEffects.find(
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
  if (
    attachedWeaponItemId === undefined ||
    effect === undefined ||
    attack.weapon.damage.kind !== "dice" ||
    attack.weapon.usage !== "melee"
  ) {
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

function isSpellWeaponAttackOverrideEffect(
  effect: BattleActiveEffect,
): effect is Extract<
  BattleActiveEffect,
  { readonly kind: "spellWeaponAttackOverride" }
> {
  return effect.kind === "spellWeaponAttackOverride";
}

function mainHandWeaponItemIdForAttack(
  actor: BattleCreatureState,
  attack: CharacterWeaponAttackActionOption,
): string | undefined {
  return actor.origin.kind === "character" &&
    actor.origin.attack?.kind === "weapon" &&
    actor.origin.attack === attack &&
    actor.origin.selectedLoadout.weapon?.unitId === attack.weapon.id
    ? actor.origin.selectedLoadout.weapon.itemId
    : undefined;
}

function offHandWeaponItemIdForAttack(
  actor: BattleCreatureState,
  attack: CharacterWeaponAttackActionOption,
): string | undefined {
  return actor.origin.kind === "character" &&
    actor.origin.offHandAttack === attack &&
    actor.origin.selectedLoadout.offHandWeapon?.unitId === attack.weapon.id
    ? actor.origin.selectedLoadout.offHandWeapon.itemId
    : undefined;
}

function lightPropertyAlternateAbilityChoices(
  choices: ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice>,
): ReadonlyNonEmptyArray<CharacterWeaponAttackAbilityChoice> {
  const [first, ...rest] = choices;
  return [
    lightPropertyAbilityChoice(first),
    ...rest.map(lightPropertyAbilityChoice),
  ];
}

function lightPropertyAbilityChoice(
  choice: CharacterWeaponAttackAbilityChoice,
): CharacterWeaponAttackAbilityChoice {
  return {
    ...choice,
    damageAbilityModifier:
      choice.abilityModifier < 0 ? choice.abilityModifier : abilityModifier(0),
  };
}

export function martialArtsBonusUnarmedStrikeActionOptionForActor(
  state: BattleState,
  actorId: CombatantId,
): CharacterUnarmedStrikeActionOption | undefined {
  const actor = state.combatants.get(actorId);
  if (
    actor === undefined ||
    actor.origin.kind !== "character" ||
    !hasMartialArtsAttackProjectionSupport(actor) ||
    !martialArtsLoadoutEligible(actor.origin)
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
        kind: "authoredReplacement",
        sourceUnitId: effect.sourceSpellId,
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
): string {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return attack.weapon.id;
  if (
    actor.origin.attack?.kind === "weapon" &&
    actor.origin.attack.weapon.id === attack.weapon.id
  ) {
    return actor.origin.selectedLoadout.weapon?.itemId ?? attack.weapon.id;
  }
  if (actor.origin.offHandAttack?.weapon.id === attack.weapon.id) {
    return (
      actor.origin.selectedLoadout.offHandWeapon?.itemId ?? attack.weapon.id
    );
  }
  return attack.weapon.id;
}

export function offHandWeaponItemIdForActor(
  state: BattleState,
  actorId: CombatantId,
  offHand: CharacterWeaponAttackActionOption,
): string | undefined {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return undefined;
  return actor.origin.selectedLoadout.offHandWeapon?.unitId ===
    offHand.weapon.id
    ? actor.origin.selectedLoadout.offHandWeapon.itemId
    : undefined;
}

export function isLightMeleeWeapon(weapon: WeaponRecord): boolean {
  return (
    weapon.usage === "melee" &&
    (weapon.properties ?? []).some((property) => property.kind === "light")
  );
}

function hasMartialArtsAttackProjectionSupport(
  actor: BattleCreatureState,
): boolean {
  if (actor.origin.kind !== "character") return false;
  return actor.origin.characterUnitRefs.some((unitRef) =>
    unitRef.supportProfiles.includes(
      MARTIAL_ARTS_ATTACK_PROJECTION_SUPPORT_PROFILE,
    ),
  );
}

function martialArtsLoadoutEligible(
  origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  >,
): boolean {
  const loadout = origin.selectedLoadout;
  if (loadout.armor !== undefined || loadout.shield !== undefined) {
    return false;
  }
  const mainWeaponEligible =
    loadout.weapon === undefined ||
    (origin.attack !== null &&
      loadout.weapon.unitId === origin.attack.weapon.id &&
      isMonkWeapon(origin.attack.weapon));
  const offHandWeaponEligible =
    loadout.offHandWeapon === undefined ||
    (origin.offHandAttack !== undefined &&
      loadout.offHandWeapon.unitId === origin.offHandAttack.weapon.id &&
      isMonkWeapon(origin.offHandAttack.weapon));
  return mainWeaponEligible && offHandWeaponEligible;
}
