import { Schema } from "effect";

import type { ClassName } from "#/features/class-tables.ts";
import { HOLD_PERSON_INFO } from "#/features/spell-enchantment.ts";
import {
  SPELL_FIREBALL,
  burningHandsDamage,
  fireballDamage,
} from "#/features/spell-evocation.ts";
import { SRD_SPELLS } from "#/features/spell-registry.ts";
import type {
  Ability,
  Condition,
  DamageType,
  DifficultyClass,
  SpellName,
  SpellSlotLevel,
} from "#/types.ts";
import { difficultyClass, spellSlotLevel } from "#/types.ts";

export const MODELED_PREPARED_SPELLS = [
  "bless",
  "burning_hands",
  "fireball",
  "guiding_bolt",
  "haste",
  "healing_word",
  "hold_person",
  "inflict_wounds",
  "spirit_guardians",
] as const satisfies ReadonlyArray<SpellName>;

export type ModeledPreparedSpell = (typeof MODELED_PREPARED_SPELLS)[number];

export const ModeledPreparedSpellSchema = Schema.Literal(
  ...MODELED_PREPARED_SPELLS,
);

export type ModeledPreparedSpellInfo = {
  readonly name: ModeledPreparedSpell;
  readonly baseLevel: number;
  readonly castingTime: "action" | "bonusAction";
  readonly concentration: boolean;
  readonly requiresVerbal: boolean;
  readonly requiresSomatic: boolean;
  readonly requiresMaterial: boolean;
  readonly durationTurns?: number;
};

export type SpellComponentRequirements = {
  readonly requiresVerbal: boolean;
  readonly requiresSomatic: boolean;
  readonly requiresMaterial: boolean;
  readonly requiresHandComponent: boolean;
};

export type BattleReadyableSpellReleasePayload = {
  readonly kind: "save";
  readonly saveAbility: Ability;
  readonly saveDC: DifficultyClass;
  readonly halfOnSuccess: boolean;
  readonly damageType: DamageType;
  readonly damageOnFail: number;
  readonly conditionOnFail: Condition;
  readonly applyCondition: boolean;
};

export type BattleReadyableSpellPayload = {
  readonly baseLevel: SpellSlotLevel;
  readonly slotLevel: SpellSlotLevel;
  readonly release: BattleReadyableSpellReleasePayload;
};

const DEFAULT_BATTLE_SPELL_SAVE_DC = difficultyClass(13);

const MODELED_PREPARED_SPELLS_BY_CLASS = {
  barbarian: [],
  bard: ["healing_word"],
  cleric: [
    "bless",
    "guiding_bolt",
    "healing_word",
    "hold_person",
    "inflict_wounds",
    "spirit_guardians",
  ],
  druid: [],
  fighter: [],
  monk: [],
  paladin: ["bless"],
  ranger: [],
  rogue: [],
  sorcerer: ["burning_hands", "fireball", "haste"],
  warlock: [],
  wizard: ["burning_hands", "fireball", "haste", "hold_person"],
} as const satisfies Readonly<
  Record<ClassName, ReadonlyArray<ModeledPreparedSpell>>
>;

function snakeCaseSpellName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCastingTime(
  castingTime: string,
): "action" | "bonusAction" | null {
  if (castingTime === "Action") return "action";
  if (castingTime === "Bonus Action") return "bonusAction";
  return null;
}

function parseConcentrationDurationTurns(duration: string): number | undefined {
  const match = /^Concentration, up to (\d+) (minute|minutes|hour|hours)$/.exec(
    duration,
  );
  if (match == null) return undefined;
  const count = Number(match[1]);
  const unit = match[2];
  if (unit.startsWith("minute")) return count * 10;
  if (unit.startsWith("hour")) return count * 600;
  return undefined;
}

function parseSpellComponentRequirements(
  components: string,
): SpellComponentRequirements {
  const requirements = {
    requiresVerbal: components.includes("V"),
    requiresSomatic: components.includes("S"),
    requiresMaterial: components.includes("M"),
  };
  return {
    ...requirements,
    requiresHandComponent:
      requirements.requiresSomatic || requirements.requiresMaterial,
  };
}

function requireSpellInfo(
  spellName: ModeledPreparedSpell,
): ModeledPreparedSpellInfo {
  const entry = SRD_SPELLS.find(
    (info) => snakeCaseSpellName(info.name) === spellName,
  );
  if (entry == null)
    throw new Error(
      `Missing SRD spell registry entry for modeled prepared spell ${spellName}`,
    );
  const castingTime = normalizeCastingTime(entry.castingTime);
  if (castingTime == null)
    throw new Error(
      `Unsupported casting time for modeled prepared spell ${spellName}: ${entry.castingTime}`,
    );
  const durationTurns = entry.concentration
    ? parseConcentrationDurationTurns(entry.duration)
    : undefined;
  if (entry.concentration && durationTurns == null) {
    throw new Error(
      `Unsupported concentration duration for modeled prepared spell ${spellName}: ${entry.duration}`,
    );
  }
  const components = parseSpellComponentRequirements(entry.components);
  return {
    name: spellName,
    baseLevel: entry.level,
    castingTime,
    concentration: entry.concentration,
    ...components,
    ...(durationTurns == null ? {} : { durationTurns }),
  };
}

export const MODELED_PREPARED_SPELL_INFO: Readonly<
  Record<ModeledPreparedSpell, ModeledPreparedSpellInfo>
> = Object.fromEntries(
  MODELED_PREPARED_SPELLS.map((spellName) => [
    spellName,
    requireSpellInfo(spellName),
  ]),
) as Readonly<Record<ModeledPreparedSpell, ModeledPreparedSpellInfo>>;

export function getModeledPreparedSpellInfo(
  spellName: SpellName,
): ModeledPreparedSpellInfo | null {
  return spellName in MODELED_PREPARED_SPELL_INFO
    ? MODELED_PREPARED_SPELL_INFO[spellName as ModeledPreparedSpell]
    : null;
}

export function getSpellComponentRequirements(
  spellName: string,
): SpellComponentRequirements | null {
  const entry = SRD_SPELLS.find(
    (info) => snakeCaseSpellName(info.name) === spellName,
  );
  return entry == null
    ? null
    : parseSpellComponentRequirements(entry.components);
}

function diceMaximum(dice: {
  readonly dice: number;
  readonly dieSize: number;
}) {
  return dice.dice * dice.dieSize;
}

export function getBattleReadyableSpellPayload(
  spellName: SpellName,
  slotLevel: SpellSlotLevel,
  saveDC: DifficultyClass = DEFAULT_BATTLE_SPELL_SAVE_DC,
): BattleReadyableSpellPayload | null {
  if (spellName === "burning_hands") {
    return {
      baseLevel: spellSlotLevel(1),
      slotLevel,
      release: {
        kind: "save",
        saveAbility: "dex",
        saveDC,
        halfOnSuccess: true,
        damageType: "fire",
        damageOnFail: diceMaximum(burningHandsDamage(slotLevel)),
        conditionOnFail: "blinded",
        applyCondition: false,
      },
    };
  }
  if (spellName === "fireball") {
    return {
      baseLevel: spellSlotLevel(SPELL_FIREBALL.level),
      slotLevel,
      release: {
        kind: "save",
        saveAbility: SPELL_FIREBALL.saveAbility ?? "dex",
        saveDC,
        halfOnSuccess: true,
        damageType: SPELL_FIREBALL.damageType,
        damageOnFail: diceMaximum(fireballDamage(slotLevel)),
        conditionOnFail: "blinded",
        applyCondition: false,
      },
    };
  }
  if (spellName === "hold_person") {
    return {
      baseLevel: spellSlotLevel(HOLD_PERSON_INFO.level),
      slotLevel,
      release: {
        kind: "save",
        saveAbility: HOLD_PERSON_INFO.saveAbility ?? "wis",
        saveDC,
        halfOnSuccess: false,
        damageType: "psychic",
        damageOnFail: 0,
        conditionOnFail:
          HOLD_PERSON_INFO.conditionApplied === "special"
            ? "paralyzed"
            : HOLD_PERSON_INFO.conditionApplied,
        applyCondition: true,
      },
    };
  }
  return null;
}

export function getBattleReadyableSpellPayloadForSlots(
  spellName: SpellName,
  baseLevel: SpellSlotLevel,
  slotsCurrent: ReadonlyArray<number>,
  saveDC?: DifficultyClass,
): BattleReadyableSpellPayload | null {
  const slotIndex = slotsCurrent.findIndex(
    (remaining, index) => index + 1 >= baseLevel && remaining > 0,
  );
  if (slotIndex < 0) return null;
  return getBattleReadyableSpellPayload(
    spellName,
    spellSlotLevel(slotIndex + 1),
    saveDC,
  );
}

export function battleReadyableSpellPayloadsFromPreparedSpells(
  preparedSpells: ReadonlySet<string>,
  slotsCurrent: ReadonlyArray<number>,
  spellSaveDcBySpell?: ReadonlyMap<SpellName, DifficultyClass>,
): ReadonlyMap<SpellName, BattleReadyableSpellPayload> {
  const payloads = new Map<SpellName, BattleReadyableSpellPayload>();
  for (const spellName of preparedSpells) {
    const modeled = getModeledPreparedSpellInfo(spellName as SpellName);
    if (modeled == null || modeled.castingTime !== "action") continue;
    const payload = getBattleReadyableSpellPayloadForSlots(
      spellName as SpellName,
      spellSlotLevel(modeled.baseLevel),
      slotsCurrent,
      spellSaveDcBySpell?.get(spellName as SpellName),
    );
    if (payload != null) payloads.set(spellName as SpellName, payload);
  }
  return payloads;
}

export function defaultPreparedSpellsForClassLevels(
  classLevels: Readonly<Partial<Record<ClassName, number>>>,
  slotsMax: ReadonlyArray<number>,
): ReadonlySet<ModeledPreparedSpell> {
  const highestSlotLevel = slotsMax.reduce(
    (current, count, index) => (count > 0 ? index + 1 : current),
    0,
  );
  const prepared = new Set<ModeledPreparedSpell>();
  for (const [className, spells] of Object.entries(
    MODELED_PREPARED_SPELLS_BY_CLASS,
  ) as ReadonlyArray<
    readonly [ClassName, ReadonlyArray<ModeledPreparedSpell>]
  >) {
    if ((classLevels[className] ?? 0) <= 0) continue;
    for (const spellName of spells) {
      if (MODELED_PREPARED_SPELL_INFO[spellName].baseLevel <= highestSlotLevel)
        prepared.add(spellName);
    }
  }
  return prepared;
}
