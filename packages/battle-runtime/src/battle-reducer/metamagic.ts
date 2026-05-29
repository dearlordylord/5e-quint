// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-cast-governor-quickened
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR

import * as Either from "effect/Either";
import type {
  BattleCreatureState,
  BattleState,
  SupportedSpellInvocation,
} from "../battle-reducer.ts";
import type {
  BattleSubject,
  SpellMetamagicSelection,
} from "../battle-subjects.ts";
import {
  characterBattleResourceIsPointPool,
  spendCharacterPointPoolResource,
  type CharacterBattleMetamagicEffectKind,
  type CharacterBattleMetamagicOptionFact,
  type CharacterBattlePointPoolResourceState,
} from "../character-battle-resources.ts";
import type { CombatantId } from "../identity.ts";
import {
  combatantHasLevelOnePlusSpellCastThisTurn,
  spellInvocationIsLevelOnePlus,
} from "./spell-turn-resources.ts";
import { REGISTERED_SPELL_PROCEDURE_PROFILES } from "./spell-procedure-profiles/registry.ts";
import {
  DISTANT_METAMAGIC_EFFECT_KIND,
  EMPOWERED_METAMAGIC_EFFECT_KIND,
  EXTENDED_METAMAGIC_EFFECT_KIND,
  metamagicApplicationsIncludeQuickened,
  metamagicSorceryPointCost,
  metamagicSorceryPointSpendIssue,
  QUICKENED_METAMAGIC_EFFECT_KIND,
  saveMetamagicSupportIssue,
  SEEKING_METAMAGIC_EFFECT_KIND,
  SUBTLE_METAMAGIC_EFFECT_KIND,
  TRANSMUTED_METAMAGIC_EFFECT_KIND,
  TWINNED_METAMAGIC_EFFECT_KIND,
} from "./metamagic-support.ts";
export {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverSpellMetamagicSelections,
  DISTANT_METAMAGIC_EFFECT_KIND,
  EMPOWERED_METAMAGIC_EFFECT_KIND,
  EXTENDED_METAMAGIC_EFFECT_KIND,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  metamagicActionCostOverride,
  metamagicApplicationsIncludeQuickened,
  QUICKENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_SPELL_METAMAGIC_SELECTION,
  SEEKING_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
  spellMetamagicLabel,
  SUBTLE_METAMAGIC_EFFECT_KIND,
  TRANSMUTED_METAMAGIC_EFFECT_KIND,
  TWINNED_METAMAGIC_EFFECT_KIND,
} from "./metamagic-support.ts";

export const DISTANT_METAMAGIC_UNSUPPORTED_MESSAGE =
  "Distant Spell is not supported until spell target witnesses carry range facts that can be rewritten without trusting authored spell identity.";
export const EXTENDED_METAMAGIC_UNSUPPORTED_MESSAGE =
  "Extended Spell is not supported until spell duration and Concentration-saving-throw roll mode are owned by a generic cast-property boundary.";
export const SUBTLE_METAMAGIC_UNSUPPORTED_MESSAGE =
  "Subtle Spell is not supported until spell-cast component witnesses can suppress Verbal and Somatic components while preserving consumed or priced Material components.";
export const TRANSMUTED_METAMAGIC_UNSUPPORTED_MESSAGE =
  "Transmuted Spell is not supported until spell damage procedure facts carry a cast-time damage-type substitution boundary that rewrites only Acid, Cold, Fire, Lightning, Poison, or Thunder damage without duplicating damage dice.";
export const TWINNED_METAMAGIC_UNSUPPORTED_MESSAGE =
  "Twinned Spell is not supported until upcast target-count projection can increase effective spell level by 1 only for procedures whose higher-slot shape targets one additional creature without duplicating spell slot state.";
export const EMPOWERED_METAMAGIC_UNSUPPORTED_MESSAGE =
  "Empowered Spell is not supported until spell damage roll fills carry a typed post-roll reroll boundary that selects original damage dice up to the caster's Charisma modifier and replaces them with forced new rolls without storing reroll opportunity state.";
export const SEEKING_METAMAGIC_UNSUPPORTED_MESSAGE =
  "Seeking Spell is not supported until spell attack roll fills carry a typed missed-spell-attack reroll boundary that replaces one missed d20 with the forced new roll without storing reroll opportunity state.";

export const QUICKENED_ACTION_SPELL_PROCEDURE_UNSUPPORTED_MESSAGE =
  "Quickened Spell is not supported for this action-casting spell procedure until its resolver threads a Bonus Action rewrite and Metamagic applications through the shared spell-cast resource boundary.";
export const QUICKENED_ACTION_CASTING_TIME_REQUIRED_MESSAGE =
  "Quickened Spell can modify only spells with a casting time of an action.";

type QuickenedActionRewriteProcedureDisposition =
  | "bonusActionRewrite"
  | "actionSpellResolverNotRewritten"
  | "notActionSpellCasting";

type QuickenedActionRewriteProcedureDispositions = {
  readonly [Profile in (typeof REGISTERED_SPELL_PROCEDURE_PROFILES)[number] as Profile["procedure"]]: Profile["metamagicCompatibility"];
} & Record<
  SupportedSpellInvocation["procedure"],
  QuickenedActionRewriteProcedureDisposition
>;

let quickenedActionRewriteProcedureDispositions:
  | QuickenedActionRewriteProcedureDispositions
  | undefined;

function quickenedActionRewriteProcedureDispositionTable(): QuickenedActionRewriteProcedureDispositions {
  // Build lazily so registry imports can finish before metamagic reads the
  // registered profile list.
  // Object.fromEntries erases the one-entry-per-procedure relationship; the
  // mapped type above keeps that registry-derived key/value invariant visible.
  quickenedActionRewriteProcedureDispositions ??= Object.freeze(
    Object.fromEntries(
      REGISTERED_SPELL_PROCEDURE_PROFILES.map((profile) => [
        profile.procedure,
        profile.metamagicCompatibility,
      ]),
    ),
  ) as QuickenedActionRewriteProcedureDispositions;
  return quickenedActionRewriteProcedureDispositions;
}

type QuickenedActionRewriteProcedure = {
  [Procedure in keyof QuickenedActionRewriteProcedureDispositions]: QuickenedActionRewriteProcedureDispositions[Procedure] extends
    "bonusActionRewrite"
    ? Procedure
    : never;
}[keyof QuickenedActionRewriteProcedureDispositions];

export type SpellMetamagicAdmissionIssue = {
  readonly tag: "spellMetamagicAdmissionIssue";
  readonly message: string;
};

export type SpellMetamagicAdmission =
  | {
      readonly tag: "ok";
      readonly applications: readonly CharacterBattleMetamagicOptionFact[];
    }
  | SpellMetamagicAdmissionIssue;

type SpellMetamagicSubject = Extract<
  BattleSubject,
  { readonly tag: "actionSpell" | "bonusActionSpell" }
>;

export function admitSpellMetamagicApplications(input: {
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly subject: SpellMetamagicSubject;
}): SpellMetamagicAdmission {
  const selections = input.subject.metamagic ?? [];
  if (selections.length === 0) {
    return { tag: "ok", applications: [] };
  }
  if (input.actor.origin.kind !== "character") {
    return metamagicIssue(
      "Metamagic selection requires a character with known Metamagic options.",
    );
  }
  const metamagic = input.actor.origin.metamagic;
  if (metamagic === undefined) {
    return metamagicIssue(
      "Metamagic selection requires a character with known Metamagic options.",
    );
  }
  if (hasDuplicateEffectKinds(selections)) {
    return metamagicIssue(
      "Metamagic selections must not repeat an option effect.",
    );
  }
  const knownApplications: CharacterBattleMetamagicOptionFact[] = [];
  for (const selection of selections) {
    const application = metamagic.knownOptions.find(
      (option) => option.effectKind === selection.effectKind,
    );
    if (application === undefined) {
      return metamagicIssue(
        "Metamagic selection must be one of the actor's known Metamagic options.",
      );
    }
    knownApplications.push(application);
  }
  const quickenedSelected =
    metamagicApplicationsIncludeQuickened(knownApplications);
  const stackingIssue = metamagicStackingIssue(knownApplications);
  if (stackingIssue !== null) {
    return metamagicIssue(stackingIssue);
  }
  const supportIssue = spellMetamagicSupportIssue({
    applications: knownApplications,
    invocation: input.invocation,
    subject: input.subject,
  });
  if (supportIssue !== null) {
    return metamagicIssue(supportIssue);
  }
  if (quickenedSelected) {
    const quickenedIssue = quickenedSpellAdmissionIssue({
      state: input.state,
      actor: input.actor,
      actorId: input.actorId,
      invocation: input.invocation,
      subject: input.subject,
    });
    if (quickenedIssue !== null) {
      return metamagicIssue(quickenedIssue);
    }
  }
  const sorceryPointIssue = metamagicSorceryPointSpendIssue({
    actor: input.actor,
    applications: knownApplications,
  });
  return sorceryPointIssue === null
    ? { tag: "ok", applications: knownApplications }
    : metamagicIssue(sorceryPointIssue);
}

export function actorCanOfferQuickenedSpellMetamagic(input: {
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
}): boolean {
  if (input.actor.origin.kind !== "character") {
    return false;
  }
  const quickened = input.actor.origin.metamagic?.knownOptions.find(
    (option) => option.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
  );
  if (quickened === undefined) {
    return false;
  }
  if (!spellInvocationHasMagicActionCastingTime(input.invocation)) {
    return false;
  }
  if (!spellInvocationSupportsQuickenedActionRewrite(input.invocation)) {
    return false;
  }
  if (!input.state.currentTurnResources.currentHasBonusAction) {
    return false;
  }
  if (
    spellInvocationIsLevelOnePlus(input.invocation) &&
    combatantHasLevelOnePlusSpellCastThisTurn(
      input.state.currentTurnResources,
      input.actorId,
    )
  ) {
    return false;
  }
  return (
    metamagicSorceryPointSpendIssue({
      actor: input.actor,
      applications: [quickened],
    }) === null
  );
}

export function spellInvocationHasMagicActionCastingTime(
  invocation: SupportedSpellInvocation,
): boolean {
  return (
    !("actionCost" in invocation) || invocation.actionCost === "magicAction"
  );
}

export function spellInvocationSupportsQuickenedActionRewrite(
  invocation: SupportedSpellInvocation,
): invocation is Extract<
  SupportedSpellInvocation,
  { readonly procedure: QuickenedActionRewriteProcedure }
> {
  return (
    quickenedActionRewriteProcedureDisposition(invocation) ===
    "bonusActionRewrite"
  );
}

export function spendSpellMetamagicSorceryPoints(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly applications: readonly CharacterBattleMetamagicOptionFact[];
}): Either.Either<BattleState, string> {
  if (input.applications.length === 0) {
    return Either.right(input.state);
  }
  const actor = input.state.combatants.get(input.actorId);
  if (actor?.origin.kind !== "character") {
    return Either.left(
      "Metamagic selection requires a character with known Metamagic options.",
    );
  }
  const metamagic = actor.origin.metamagic;
  if (metamagic === undefined) {
    return Either.left(
      "Metamagic selection requires a character with known Metamagic options.",
    );
  }
  const resource = actor.origin.resources.find(
    (candidate): candidate is CharacterBattlePointPoolResourceState =>
      candidate.unit.id === metamagic.sorceryPointResourceUnitId &&
      characterBattleResourceIsPointPool(candidate),
  );
  if (resource === undefined) {
    return Either.left("Metamagic requires its shared Sorcery Point resource.");
  }
  const spent = spendCharacterPointPoolResource({
    resource,
    points: metamagicSorceryPointCost(input.applications),
  });
  if (Either.isLeft(spent)) {
    return Either.left("Metamagic requires enough unexpended Sorcery Points.");
  }
  return Either.right({
    ...input.state,
    combatants: new Map(input.state.combatants).set(input.actorId, {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((candidate) =>
          candidate.unit.id === metamagic.sorceryPointResourceUnitId &&
          characterBattleResourceIsPointPool(candidate)
            ? spent.right
            : candidate,
        ),
      },
    }),
  });
}

function metamagicIssue(message: string): SpellMetamagicAdmissionIssue {
  return { tag: "spellMetamagicAdmissionIssue", message };
}

function hasDuplicateEffectKinds(
  selections: readonly SpellMetamagicSelection[],
): boolean {
  return (
    new Set(selections.map((selection) => selection.effectKind)).size !==
    selections.length
  );
}

function metamagicStackingIssue(
  applications: readonly CharacterBattleMetamagicOptionFact[],
): string | null {
  if (applications.length <= 1) {
    return null;
  }
  const hasStackingException = applications.some(
    (application) =>
      application.stackingMode === "can_combine_with_different_metamagic",
  );
  return applications.length === 2 && hasStackingException
    ? null
    : "A spell can use only one Metamagic option unless one selected option explicitly combines with a different Metamagic option.";
}

function spellMetamagicSupportIssue(input: {
  readonly applications: readonly CharacterBattleMetamagicOptionFact[];
  readonly invocation: SupportedSpellInvocation;
  readonly subject: Pick<SpellMetamagicSubject, "tag" | "mode">;
}): string | null {
  const effectKinds = new Set(
    input.applications.map((option) => option.effectKind),
  );
  if (effectKinds.has(QUICKENED_METAMAGIC_EFFECT_KIND)) {
    if (
      !input.applications.every(
        (application) =>
          application.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
      )
    ) {
      return "Selected Metamagic option effect is not supported for this spell procedure.";
    }
    const quickenedSupportIssue = quickenedActionRewriteSupportIssue(
      input.invocation,
    );
    if (quickenedSupportIssue !== null) {
      return quickenedSupportIssue;
    }
    return null;
  }
  const castPropertyIssue = castPropertyMetamagicSupportIssue(effectKinds);
  if (castPropertyIssue !== null) {
    return castPropertyIssue;
  }
  const damageShapeIssue = damageShapeMetamagicSupportIssue(effectKinds);
  if (damageShapeIssue !== null) {
    return damageShapeIssue;
  }
  const rerollIssue = rerollMetamagicSupportIssue(effectKinds);
  if (rerollIssue !== null) {
    return rerollIssue;
  }
  return saveMetamagicSupportIssue({
    effectKinds,
    invocation: input.invocation,
    subject: input.subject,
  });
}

function quickenedActionRewriteProcedureDisposition(
  invocation: SupportedSpellInvocation,
): QuickenedActionRewriteProcedureDisposition {
  return quickenedActionRewriteProcedureDispositionTable()[
    invocation.procedure
  ];
}

function quickenedActionRewriteSupportIssue(
  invocation: SupportedSpellInvocation,
): string | null {
  const disposition = quickenedActionRewriteProcedureDisposition(invocation);
  if (disposition === "bonusActionRewrite") {
    return null;
  }
  if (disposition === "actionSpellResolverNotRewritten") {
    return QUICKENED_ACTION_SPELL_PROCEDURE_UNSUPPORTED_MESSAGE;
  }
  return QUICKENED_ACTION_CASTING_TIME_REQUIRED_MESSAGE;
}

function castPropertyMetamagicSupportIssue(
  effectKinds: ReadonlySet<CharacterBattleMetamagicEffectKind>,
): string | null {
  if (effectKinds.has(DISTANT_METAMAGIC_EFFECT_KIND)) {
    return DISTANT_METAMAGIC_UNSUPPORTED_MESSAGE;
  }
  if (effectKinds.has(EXTENDED_METAMAGIC_EFFECT_KIND)) {
    return EXTENDED_METAMAGIC_UNSUPPORTED_MESSAGE;
  }
  return effectKinds.has(SUBTLE_METAMAGIC_EFFECT_KIND)
    ? SUBTLE_METAMAGIC_UNSUPPORTED_MESSAGE
    : null;
}

function damageShapeMetamagicSupportIssue(
  effectKinds: ReadonlySet<CharacterBattleMetamagicEffectKind>,
): string | null {
  if (effectKinds.has(TRANSMUTED_METAMAGIC_EFFECT_KIND)) {
    return TRANSMUTED_METAMAGIC_UNSUPPORTED_MESSAGE;
  }
  return effectKinds.has(TWINNED_METAMAGIC_EFFECT_KIND)
    ? TWINNED_METAMAGIC_UNSUPPORTED_MESSAGE
    : null;
}

function rerollMetamagicSupportIssue(
  effectKinds: ReadonlySet<CharacterBattleMetamagicEffectKind>,
): string | null {
  if (effectKinds.has(EMPOWERED_METAMAGIC_EFFECT_KIND)) {
    return EMPOWERED_METAMAGIC_UNSUPPORTED_MESSAGE;
  }
  return effectKinds.has(SEEKING_METAMAGIC_EFFECT_KIND)
    ? SEEKING_METAMAGIC_UNSUPPORTED_MESSAGE
    : null;
}

function quickenedSpellAdmissionIssue(input: {
  readonly state: BattleState;
  readonly actor: BattleCreatureState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly subject: SpellMetamagicSubject;
}): string | null {
  if (input.subject.tag !== "bonusActionSpell") {
    return "Quickened Spell must use the Bonus Action spell subject.";
  }
  if (!spellInvocationHasMagicActionCastingTime(input.invocation)) {
    return QUICKENED_ACTION_CASTING_TIME_REQUIRED_MESSAGE;
  }
  if (
    spellInvocationIsLevelOnePlus(input.invocation) &&
    combatantHasLevelOnePlusSpellCastThisTurn(
      input.state.currentTurnResources,
      input.actorId,
    )
  ) {
    return "Quickened Spell cannot modify a level 1+ spell after this turn has already cast a level 1+ spell.";
  }
  return input.actor.origin.kind === "character" &&
    input.actor.origin.metamagic?.knownOptions.some(
      (option) => option.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    )
    ? null
    : "Quickened Spell selection requires the actor to know Quickened Spell.";
}
