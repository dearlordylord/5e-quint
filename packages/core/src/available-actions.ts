import { bardicInspirationDie } from "#/features/class-bard.ts"
import { guards } from "#/machine-guards.ts"
import { type DndContext, type DndEvent } from "#/machine-types.ts"
import { spellSlotLevel, type SpellSlotLevel } from "#/types.ts"
import type { ShoveChoice } from "#/types.ts"

// --- Cost and outcome ---

export type ResourceCost = {
  readonly action?: true
  readonly bonusAction?: true
  readonly reaction?: true
  readonly movement?: number
  readonly spellSlot?: SpellSlotLevel
  readonly charge?: string
}

export type OutcomeDescription = {
  readonly summary: string
}

// --- Hole utilities (PRD §"Action Token Type Design") ---

export type Hole<T> = { readonly options: ReadonlyArray<T> }
export type MaybeHole<T> = T | Hole<T>
export type FillHoles<T> = {
  readonly [K in keyof T]: T[K] extends Hole<infer V> ? V : T[K]
}

// --- Player action catalog ---
// Source of truth for which DndEvent types are player-initiated.
// satisfies ReadonlyArray<DndEvent["type"]>: compile error on typo or deleted event type.
// PlayerActionType (and therefore ActionToken, TOKEN_BUILDERS) is derived — never hand-written.

export const PLAYER_ACTION_TYPES = [
  // Movement
  "STAND_FROM_PRONE",
  "DROP_PRONE",
  "USE_BONUS_MOVEMENT",
  // Grappling / shoving (battle context required — builders return null until Phase 4)
  "GRAPPLE",
  "RELEASE_GRAPPLE",
  "ESCAPE_GRAPPLE",
  "SHOVE",
  // Rest / recovery
  "SHORT_REST",
  "LONG_REST",
  "SPEND_HIT_DIE",
  // General
  "USE_HEROIC_INSPIRATION",
  // Monster resources
  "USE_LEGENDARY_ACTION",
  "USE_RECHARGE_ABILITY",
  "USE_DAILY_ABILITY",
  // Fighter
  "USE_SECOND_WIND",
  "USE_ACTION_SURGE",
  "USE_INDOMITABLE",
  "USE_TACTICAL_MIND",
  // Barbarian
  "ENTER_RAGE",
  "END_RAGE",
  "EXTEND_RAGE_BA",
  "DECLARE_RECKLESS",
  "USE_INTIMIDATING_PRESENCE",
  "USE_BRUTAL_STRIKE",
  "USE_RELENTLESS_RAGE",
  // Paladin
  "USE_LAY_ON_HANDS",
  "USE_PALADIN_CHANNEL_DIVINITY",
  "USE_DIVINE_SMITE",
  "USE_DIVINE_SMITE_FREE",
  // Monk
  "FLURRY_OF_BLOWS",
  "PATIENT_DEFENSE_FREE",
  "PATIENT_DEFENSE_FOCUS",
  "STEP_OF_THE_WIND_FREE",
  "STEP_OF_THE_WIND_FOCUS",
  "STUNNING_STRIKE",
  "WHOLENESS_OF_BODY",
  "UNCANNY_METABOLISM",
  // Wizard
  "USE_ARCANE_RECOVERY",
  "USE_OVERCHANNEL",
  // Rogue
  "USE_SNEAK_ATTACK",
  "USE_STEADY_AIM",
  "CUNNING_ACTION_DASH",
  "CUNNING_ACTION_DISENGAGE",
  "CUNNING_ACTION_HIDE",
  "USE_UNCANNY_DODGE",
  "USE_CUNNING_STRIKE",
  // Cleric
  "USE_CLERIC_CHANNEL_DIVINITY",
  // Warlock
  "USE_MAGICAL_CUNNING",
  "USE_MYSTIC_ARCANUM",
  "USE_ELDRITCH_SMITE",
  // Sorcerer
  "CONVERT_SLOT_TO_POINTS",
  "CONVERT_POINTS_TO_SLOT",
  "USE_INNATE_SORCERY",
  "USE_METAMAGIC",
  // Ranger
  "USE_FREE_HUNTERS_MARK",
  "USE_TIRELESS",
  "USE_NATURES_VEIL",
  // Bard
  "USE_BARDIC_INSPIRATION",
  "USE_CUTTING_WORDS",
  "USE_FONT_SLOT_RESTORE",
  "USE_PEERLESS_SKILL",
  // Druid
  "ENTER_WILD_SHAPE",
  "EXIT_WILD_SHAPE",
  "USE_WILD_RESURGENCE_CHARGE",
  "USE_WILD_RESURGENCE_SLOT",
] as const satisfies ReadonlyArray<DndEvent["type"]>

export type PlayerActionType = (typeof PLAYER_ACTION_TYPES)[number]

// --- Token shapes ---

type SimpleToken<T extends PlayerActionType> = {
  readonly type: T
  readonly cost: ResourceCost
  readonly outcome: OutcomeDescription
}

// Overrides for tokens with player-choice holes.
// satisfies Partial<Record<...>>: compile error if a key is not in PlayerActionType.
type TokenOverrides = {
  readonly SHOVE: SimpleToken<"SHOVE"> & { readonly choice: Hole<ShoveChoice> }
  readonly CONVERT_SLOT_TO_POINTS: SimpleToken<"CONVERT_SLOT_TO_POINTS"> & {
    readonly slotLevel: Hole<SpellSlotLevel>
  }
  readonly CONVERT_POINTS_TO_SLOT: SimpleToken<"CONVERT_POINTS_TO_SLOT"> & {
    readonly slotLevel: Hole<SpellSlotLevel>
  }
  readonly USE_ARCANE_RECOVERY: SimpleToken<"USE_ARCANE_RECOVERY"> & {
    readonly slotLevel: Hole<SpellSlotLevel>
  }
  readonly USE_MYSTIC_ARCANUM: SimpleToken<"USE_MYSTIC_ARCANUM"> & {
    readonly spellLevel: Hole<SpellSlotLevel>
  }
  readonly USE_FONT_SLOT_RESTORE: SimpleToken<"USE_FONT_SLOT_RESTORE"> & {
    readonly slotLevel: Hole<SpellSlotLevel>
  }
  readonly USE_WILD_RESURGENCE_CHARGE: SimpleToken<"USE_WILD_RESURGENCE_CHARGE"> & {
    readonly slotLevel: Hole<SpellSlotLevel>
  }
}
// Compile-time assertion: every key in TokenOverrides must be a PlayerActionType.
declare const _checkOverrideKeys: keyof TokenOverrides extends PlayerActionType ? true : never

// Complete mapping: use override shape if defined, else SimpleToken.
// Being a mapped type over PlayerActionType makes it inherently exhaustive.
export type TokenFor = {
  [K in PlayerActionType]: K extends keyof TokenOverrides ? TokenOverrides[K] : SimpleToken<K>
}

// Derived union — never hand-written separately.
export type ActionToken = TokenFor[PlayerActionType]

// --- Helpers ---

// Dummy event for context-only guards (event param unused in those guards)
const DUMMY_EVENT: DndEvent = { type: "STABILIZE" }
const g = (ctx: DndContext): { context: DndContext; event: DndEvent } => ({ context: ctx, event: DUMMY_EVENT })

function occupiedSlotLevels(ctx: DndContext): ReadonlyArray<SpellSlotLevel> {
  return ctx.slotsCurrent
    .map((count, i) => (count > 0 ? spellSlotLevel(i + 1) : null))
    .filter((x): x is SpellSlotLevel => x !== null)
}

function expiredSlotLevels(ctx: DndContext): ReadonlyArray<SpellSlotLevel> {
  return ctx.slotsMax
    .map((max, i) => (max > 0 && (ctx.slotsCurrent[i] ?? 0) < max ? spellSlotLevel(i + 1) : null))
    .filter((x): x is SpellSlotLevel => x !== null)
}

function mysticArcanumLevels(ctx: DndContext): ReadonlyArray<SpellSlotLevel> {
  const ws = ctx.classStates.warlock
  if (!ws) return []
  return ([6, 7, 8, 9] as const)
    .filter((lvl) => lvl <= ws.level - 5 + 6 && !ws.mysticArcanumUsed.has(lvl))
    .map((lvl) => spellSlotLevel(lvl))
}

// --- Token builders ---
// Each builder: (ctx) → token | null (null = action not available in this state).

const TOKEN_BUILDERS: { [K in PlayerActionType]: (ctx: DndContext) => TokenFor[K] | null } = {
  STAND_FROM_PRONE: (ctx) =>
    guards.canStandFromProne(g(ctx))
      ? {
          type: "STAND_FROM_PRONE",
          cost: { movement: Math.floor(ctx.effectiveSpeed / 2) },
          outcome: { summary: "Stand up, ending the prone condition" },
        }
      : null,

  DROP_PRONE: (ctx) =>
    !ctx.prone && ctx.hp > 0
      ? {
          type: "DROP_PRONE",
          cost: {},
          outcome: { summary: "Drop prone (ranged attacks against you have disadvantage; melee attacks have advantage)" },
        }
      : null,

  USE_BONUS_MOVEMENT: (ctx) =>
    guards.hasBonusMovement(g(ctx))
      ? {
          type: "USE_BONUS_MOVEMENT",
          cost: {},
          outcome: { summary: `Move up to ${ctx.bonusMovementRemaining} additional feet` },
        }
      : null,

  GRAPPLE: () => null, // requires battle context (target) — Phase 4

  RELEASE_GRAPPLE: () => null, // requires battle context (grappling state) — Phase 4

  ESCAPE_GRAPPLE: (ctx) =>
    ctx.grappled
      ? {
          type: "ESCAPE_GRAPPLE",
          cost: { action: true },
          outcome: { summary: "Attempt to escape a grapple (Athletics or Acrobatics vs grappler's Athletics)" },
        }
      : null,

  SHOVE: () => null, // requires battle context (target) — Phase 4

  SHORT_REST: (ctx) =>
    !ctx.inCombat && ctx.hp > 0
      ? {
          type: "SHORT_REST",
          cost: {},
          outcome: { summary: "Take a short rest (spend hit dice to recover HP, restore short-rest resources)" },
        }
      : null,

  LONG_REST: (ctx) =>
    guards.longRestHeals(g(ctx))
      ? {
          type: "LONG_REST",
          cost: {},
          outcome: { summary: "Take a long rest (recover all HP, spell slots, and class resources)" },
        }
      : null,

  SPEND_HIT_DIE: () => null, // sub-action during SHORT_REST; parameterized by className + roll

  USE_HEROIC_INSPIRATION: () => null, // guard not yet wired — TODO

  USE_LEGENDARY_ACTION: () => null, // monster only
  USE_RECHARGE_ABILITY: () => null, // monster only
  USE_DAILY_ABILITY: () => null, // monster only

  USE_SECOND_WIND: (ctx) =>
    guards.canSecondWind(g(ctx))
      ? {
          type: "USE_SECOND_WIND",
          cost: { bonusAction: true, charge: "secondWind" },
          outcome: { summary: `Heal 1d10 + ${ctx.classStates.fighter?.level ?? 0} HP` },
        }
      : null,

  USE_ACTION_SURGE: (ctx) =>
    guards.canActionSurge(g(ctx))
      ? {
          type: "USE_ACTION_SURGE",
          cost: { charge: "actionSurge" },
          outcome: { summary: "Gain one additional action this turn" },
        }
      : null,

  USE_INDOMITABLE: (ctx) =>
    guards.canIndomitable(g(ctx))
      ? {
          type: "USE_INDOMITABLE",
          cost: { charge: "indomitable" },
          outcome: { summary: "Reroll a failed saving throw, using the new roll" },
        }
      : null,

  USE_TACTICAL_MIND: (ctx) =>
    guards.canTacticalMind(g(ctx))
      ? {
          type: "USE_TACTICAL_MIND",
          cost: { charge: "secondWind" },
          outcome: { summary: "Expend a Second Wind charge to add 1d10 to a failed ability check" },
        }
      : null,

  ENTER_RAGE: (ctx) =>
    guards.canEnterRage(g(ctx))
      ? {
          type: "ENTER_RAGE",
          cost: { bonusAction: true, charge: "rage" },
          outcome: {
            summary:
              "Enter Rage: advantage on Strength checks/saves, bonus damage, resistance to bludgeoning/piercing/slashing",
          },
        }
      : null,

  END_RAGE: (ctx) =>
    guards.isRaging(g(ctx))
      ? {
          type: "END_RAGE",
          cost: {},
          outcome: { summary: "End Rage voluntarily" },
        }
      : null,

  EXTEND_RAGE_BA: (ctx) =>
    guards.canExtendRageBA(g(ctx))
      ? {
          type: "EXTEND_RAGE_BA",
          cost: { bonusAction: true },
          outcome: { summary: "Use bonus action to keep Rage active for another round" },
        }
      : null,

  DECLARE_RECKLESS: (ctx) =>
    guards.canDeclareReckless(g(ctx))
      ? {
          type: "DECLARE_RECKLESS",
          cost: {},
          outcome: {
            summary: "Attack recklessly: advantage on attacks this turn; enemies have advantage against you until next turn",
          },
        }
      : null,

  USE_INTIMIDATING_PRESENCE: (ctx) =>
    guards.canIntimidatingPresence(g(ctx))
      ? {
          type: "USE_INTIMIDATING_PRESENCE",
          cost: { action: true, charge: "intimidatingPresence" },
          outcome: { summary: "Frighten a creature within 30 ft until end of your next turn (Wisdom save)" },
        }
      : null,

  USE_BRUTAL_STRIKE: (ctx) =>
    guards.canBrutalStrike(g(ctx))
      ? {
          type: "USE_BRUTAL_STRIKE",
          cost: { charge: "brutalStrike" },
          outcome: { summary: "Forgo Reckless Attack advantage to apply a Brutal Strike effect on a hit" },
        }
      : null,

  USE_RELENTLESS_RAGE: (ctx) =>
    guards.canRelentlessRage(g(ctx))
      ? {
          type: "USE_RELENTLESS_RAGE",
          cost: {},
          outcome: {
            summary: "When reduced to 0 HP while raging: Constitution save to drop to 1 HP instead",
          },
        }
      : null,

  USE_LAY_ON_HANDS: (ctx) =>
    guards.canLayOnHands(g(ctx))
      ? {
          type: "USE_LAY_ON_HANDS",
          cost: { bonusAction: true, charge: "layOnHands" },
          outcome: {
            summary: `Restore up to ${ctx.classStates.paladin?.layOnHandsPool ?? 0} HP from the Lay on Hands pool`,
          },
        }
      : null,

  USE_PALADIN_CHANNEL_DIVINITY: (ctx) =>
    guards.canPaladinCD(g(ctx))
      ? {
          type: "USE_PALADIN_CHANNEL_DIVINITY",
          cost: { action: true, charge: "channelDivinity" },
          outcome: { summary: "Use Paladin Channel Divinity" },
        }
      : null,

  USE_DIVINE_SMITE: (ctx) =>
    guards.canDivineSmite(g(ctx))
      ? {
          type: "USE_DIVINE_SMITE",
          cost: { bonusAction: true },
          outcome: { summary: "After a melee hit: expend a spell slot to deal 2d8 radiant + 1d8 per slot level above 1st" },
        }
      : null,

  USE_DIVINE_SMITE_FREE: (ctx) =>
    guards.canDivineSmiteFree(g(ctx))
      ? {
          type: "USE_DIVINE_SMITE_FREE",
          cost: { bonusAction: true },
          outcome: { summary: "On a critical hit: trigger a free Divine Smite (no slot expended)" },
        }
      : null,

  FLURRY_OF_BLOWS: (ctx) =>
    guards.canMonkFocusBA(g(ctx))
      ? {
          type: "FLURRY_OF_BLOWS",
          cost: { bonusAction: true, charge: "focusPoints" },
          outcome: { summary: "Spend 1 Focus Point: make two unarmed strikes as a bonus action" },
        }
      : null,

  PATIENT_DEFENSE_FREE: (ctx) =>
    guards.canMonkFreeBA(g(ctx))
      ? {
          type: "PATIENT_DEFENSE_FREE",
          cost: { bonusAction: true },
          outcome: { summary: "Take the Dodge action as a bonus action" },
        }
      : null,

  PATIENT_DEFENSE_FOCUS: (ctx) =>
    guards.canMonkFocusBA(g(ctx))
      ? {
          type: "PATIENT_DEFENSE_FOCUS",
          cost: { bonusAction: true, charge: "focusPoints" },
          outcome: { summary: "Spend 1 Focus Point: Dodge + add Wisdom modifier to saving throws until next turn" },
        }
      : null,

  STEP_OF_THE_WIND_FREE: (ctx) =>
    guards.canMonkFreeBA(g(ctx))
      ? {
          type: "STEP_OF_THE_WIND_FREE",
          cost: { bonusAction: true },
          outcome: { summary: "Disengage or Dash as a bonus action; jump distance doubled" },
        }
      : null,

  STEP_OF_THE_WIND_FOCUS: (ctx) =>
    guards.canMonkFocusBA(g(ctx))
      ? {
          type: "STEP_OF_THE_WIND_FOCUS",
          cost: { bonusAction: true, charge: "focusPoints" },
          outcome: { summary: "Spend 1 Focus Point: Disengage or Dash, and carry a willing creature" },
        }
      : null,

  STUNNING_STRIKE: (ctx) =>
    guards.canStunningStrike(g(ctx))
      ? {
          type: "STUNNING_STRIKE",
          cost: { charge: "focusPoints" },
          outcome: {
            summary: "After a hit: spend 1 Focus Point to force a Constitution save or stun the target until end of your next turn",
          },
        }
      : null,

  WHOLENESS_OF_BODY: (ctx) =>
    guards.canWholenessOfBody(g(ctx))
      ? {
          type: "WHOLENESS_OF_BODY",
          cost: { bonusAction: true, charge: "wholenessOfBody" },
          outcome: {
            summary: `Heal ${Math.floor((ctx.classStates.monk?.level ?? 0) / 2)} × 1d8 HP`,
          },
        }
      : null,

  UNCANNY_METABOLISM: (ctx) =>
    guards.canUncannyMetabolism(g(ctx))
      ? {
          type: "UNCANNY_METABOLISM",
          cost: { action: true, charge: "uncannyMetabolism" },
          outcome: { summary: "Roll a Martial Arts die to regain that many Focus Points and HP" },
        }
      : null,

  USE_ARCANE_RECOVERY: (ctx) =>
    guards.canArcaneRecovery(g(ctx))
      ? {
          type: "USE_ARCANE_RECOVERY",
          cost: { charge: "arcaneRecovery" },
          slotLevel: { options: expiredSlotLevels(ctx) },
          outcome: {
            summary: `Recover expended spell slots with combined levels ≤ ${Math.ceil((ctx.classStates.wizard?.level ?? 0) / 2)}`,
          },
        }
      : null,

  USE_OVERCHANNEL: (ctx) =>
    guards.canOverchannel(g(ctx))
      ? {
          type: "USE_OVERCHANNEL",
          cost: {},
          outcome: {
            summary: "Deal maximum damage with a 1st–5th level evocation spell (reuse deals necrotic damage)",
          },
        }
      : null,

  USE_SNEAK_ATTACK: (ctx) =>
    guards.canSneakAttack(g(ctx))
      ? {
          type: "USE_SNEAK_ATTACK",
          cost: {},
          outcome: {
            summary: `Add ${Math.ceil((ctx.classStates.rogue?.level ?? 0) / 2)}d6 damage to one attack with advantage or an ally adjacent to target`,
          },
        }
      : null,

  USE_STEADY_AIM: (ctx) =>
    guards.canSteadyAim(g(ctx))
      ? {
          type: "USE_STEADY_AIM",
          cost: { bonusAction: true, charge: "steadyAim" },
          outcome: { summary: "Gain advantage on your next attack this turn (cannot move until end of turn)" },
        }
      : null,

  CUNNING_ACTION_DASH: (ctx) =>
    guards.canCunningAction(g(ctx))
      ? {
          type: "CUNNING_ACTION_DASH",
          cost: { bonusAction: true },
          outcome: { summary: "Dash as a bonus action" },
        }
      : null,

  CUNNING_ACTION_DISENGAGE: (ctx) =>
    guards.canCunningAction(g(ctx))
      ? {
          type: "CUNNING_ACTION_DISENGAGE",
          cost: { bonusAction: true },
          outcome: { summary: "Disengage as a bonus action" },
        }
      : null,

  CUNNING_ACTION_HIDE: (ctx) =>
    guards.canCunningAction(g(ctx))
      ? {
          type: "CUNNING_ACTION_HIDE",
          cost: { bonusAction: true },
          outcome: { summary: "Hide as a bonus action" },
        }
      : null,

  USE_UNCANNY_DODGE: (ctx) =>
    guards.canUncannyDodge(g(ctx))
      ? {
          type: "USE_UNCANNY_DODGE",
          cost: { reaction: true },
          outcome: { summary: "When hit by an attacker you can see: use reaction to halve the attack's damage" },
        }
      : null,

  USE_CUNNING_STRIKE: (ctx) =>
    guards.canCunningStrike(g(ctx))
      ? {
          type: "USE_CUNNING_STRIKE",
          cost: { charge: "cunningStrike" },
          outcome: { summary: "Forgo 1d6 of Sneak Attack damage to apply a Cunning Strike effect" },
        }
      : null,

  USE_CLERIC_CHANNEL_DIVINITY: (ctx) =>
    guards.canClericCD(g(ctx))
      ? {
          type: "USE_CLERIC_CHANNEL_DIVINITY",
          cost: { action: true, charge: "channelDivinity" },
          outcome: { summary: "Use Cleric Channel Divinity" },
        }
      : null,

  USE_MAGICAL_CUNNING: (ctx) =>
    guards.canMagicalCunning(g(ctx))
      ? {
          type: "USE_MAGICAL_CUNNING",
          cost: { charge: "magicalCunning" },
          outcome: { summary: "Regain half of all expended pact spell slots (rounded up)" },
        }
      : null,

  USE_MYSTIC_ARCANUM: (ctx) =>
    guards.canMysticArcanum(g(ctx))
      ? {
          type: "USE_MYSTIC_ARCANUM",
          cost: { charge: "mysticArcanum" },
          spellLevel: { options: mysticArcanumLevels(ctx) },
          outcome: { summary: "Cast a Mystic Arcanum spell (6th–9th level, once per long rest per level)" },
        }
      : null,

  USE_ELDRITCH_SMITE: (ctx) =>
    guards.canEldritchSmite(g(ctx))
      ? {
          type: "USE_ELDRITCH_SMITE",
          cost: { charge: "pactSlot" },
          outcome: {
            summary:
              "On a hit: expend a pact slot to deal 1d8 force per slot level and knock Large-or-smaller targets prone",
          },
        }
      : null,

  CONVERT_SLOT_TO_POINTS: (ctx) =>
    guards.canConvertSlotToPoints(g(ctx))
      ? {
          type: "CONVERT_SLOT_TO_POINTS",
          cost: { action: true },
          slotLevel: { options: occupiedSlotLevels(ctx) },
          outcome: { summary: "Expend a spell slot to gain sorcery points equal to its level" },
        }
      : null,

  CONVERT_POINTS_TO_SLOT: (ctx) =>
    guards.canConvertPointsToSlot(g(ctx))
      ? {
          type: "CONVERT_POINTS_TO_SLOT",
          cost: { bonusAction: true },
          slotLevel: { options: expiredSlotLevels(ctx) },
          outcome: { summary: "Spend sorcery points to create a spell slot" },
        }
      : null,

  USE_INNATE_SORCERY: (ctx) =>
    guards.canInnateSorcery(g(ctx))
      ? {
          type: "USE_INNATE_SORCERY",
          cost: { bonusAction: true, charge: "innateSorcery" },
          outcome: {
            summary:
              "Radiate magical power: next spell cast has advantage on attack roll or target has disadvantage on save",
          },
        }
      : null,

  USE_METAMAGIC: (ctx) =>
    guards.canMetamagic(g(ctx))
      ? {
          type: "USE_METAMAGIC",
          cost: { charge: "sorceryPoints" },
          outcome: { summary: "Apply a Metamagic option to a spell" },
        }
      : null,

  USE_FREE_HUNTERS_MARK: (ctx) =>
    guards.canFreeHuntersMark(g(ctx))
      ? {
          type: "USE_FREE_HUNTERS_MARK",
          cost: { bonusAction: true, charge: "freeHuntersMark" },
          outcome: { summary: "Cast Hunter's Mark without expending a spell slot" },
        }
      : null,

  USE_TIRELESS: (ctx) =>
    guards.canTireless(g(ctx))
      ? {
          type: "USE_TIRELESS",
          cost: { action: true, charge: "tireless" },
          outcome: { summary: "Spend an action to gain temporary HP (roll 1d8 + Wisdom modifier)" },
        }
      : null,

  USE_NATURES_VEIL: (ctx) =>
    guards.canNaturesVeil(g(ctx))
      ? {
          type: "USE_NATURES_VEIL",
          cost: { bonusAction: true, charge: "naturesVeil" },
          outcome: { summary: "Become invisible until the start of your next turn" },
        }
      : null,

  USE_BARDIC_INSPIRATION: (ctx) =>
    guards.canBardicInspiration(g(ctx))
      ? {
          type: "USE_BARDIC_INSPIRATION",
          cost: { bonusAction: true, charge: "bardicInspiration" },
          outcome: {
            summary: `Grant a Bardic Inspiration die (1d${bardicInspirationDie(ctx.classStates.bard?.level ?? 0)}) to a creature within 60 ft`,
          },
        }
      : null,

  USE_CUTTING_WORDS: (ctx) =>
    guards.canCuttingWords(g(ctx))
      ? {
          type: "USE_CUTTING_WORDS",
          cost: { reaction: true, charge: "bardicInspiration" },
          outcome: {
            summary: "When a creature makes an attack, ability check, or damage roll: subtract a Bardic Inspiration die",
          },
        }
      : null,

  USE_FONT_SLOT_RESTORE: (ctx) =>
    guards.canFontSlotRestore(g(ctx))
      ? {
          type: "USE_FONT_SLOT_RESTORE",
          cost: { action: true },
          slotLevel: { options: expiredSlotLevels(ctx) },
          outcome: { summary: "Font of Inspiration: expend a spell slot to restore a Bardic Inspiration charge" },
        }
      : null,

  USE_PEERLESS_SKILL: (ctx) =>
    guards.canPeerlessSkill(g(ctx))
      ? {
          type: "USE_PEERLESS_SKILL",
          cost: { charge: "bardicInspiration" },
          outcome: { summary: "Add a Bardic Inspiration die to your own ability check" },
        }
      : null,

  ENTER_WILD_SHAPE: (ctx) =>
    guards.canEnterWildShape(g(ctx))
      ? {
          type: "ENTER_WILD_SHAPE",
          cost: { bonusAction: true, charge: "wildShape" },
          outcome: { summary: "Transform into a beast form using Wild Shape" },
        }
      : null,

  EXIT_WILD_SHAPE: (ctx) =>
    guards.canExitWildShape(g(ctx))
      ? {
          type: "EXIT_WILD_SHAPE",
          cost: { bonusAction: true },
          outcome: { summary: "Revert from Wild Shape to normal form" },
        }
      : null,

  USE_WILD_RESURGENCE_CHARGE: (ctx) =>
    guards.canWildResurgenceCharge(g(ctx))
      ? {
          type: "USE_WILD_RESURGENCE_CHARGE",
          cost: { charge: "wildShape" },
          slotLevel: { options: occupiedSlotLevels(ctx) },
          outcome: { summary: "Expend a spell slot to regain a Wild Shape charge" },
        }
      : null,

  USE_WILD_RESURGENCE_SLOT: (ctx) =>
    guards.canWildResurgenceSlot(g(ctx))
      ? {
          type: "USE_WILD_RESURGENCE_SLOT",
          cost: { charge: "wildShape" },
          outcome: { summary: "Expend a Wild Shape charge to regain a 1st-level spell slot" },
        }
      : null,
}

// --- Public API ---

export function getAvailableActions(ctx: DndContext): ActionToken[] {
  return PLAYER_ACTION_TYPES.flatMap((type) => {
    const token = (TOKEN_BUILDERS[type] as (ctx: DndContext) => ActionToken | null)(ctx)
    return token !== null ? [token] : []
  })
}
