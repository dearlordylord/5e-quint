import { Schema } from "effect";

import type { ClassName } from "#/features/class-tables.ts";
import {
  type BattleReadyableSpellPayload,
  getSpellRecord,
  getBattleReadyableSpellMechanics,
  getSpellRecordStrict,
  makeSpellLibrary,
  projectBattleReadyableSpellPayload,
  SRD_SPELLS,
} from "#/features/spell-registry.ts";
import type {
  ActivationTiming,
  DifficultyClass,
  SpellId,
  SpellName,
  SpellSlotLevel,
} from "#/types.ts";
import { difficultyClass, spellId, spellSlotLevel } from "#/types.ts";

export const MODELED_PREPARED_SPELLS = [
  "acid_splash",
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
  readonly castingTime: Exclude<ActivationTiming, "reaction">;
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

const DEFAULT_BATTLE_SPELL_SAVE_DC = difficultyClass(13);
const SPELL_LIBRARY = makeSpellLibrary(SRD_SPELLS);

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
  sorcerer: ["acid_splash", "burning_hands", "fireball", "haste"],
  warlock: [],
  wizard: ["acid_splash", "burning_hands", "fireball", "haste", "hold_person"],
} as const satisfies Readonly<
  Record<ClassName, ReadonlyArray<ModeledPreparedSpell>>
>;

export function normalizeCastingTime(
  castingTime: string,
): ActivationTiming | null {
  if (castingTime === "Action") return "action";
  if (castingTime === "Action or Ritual") return "action";
  if (castingTime === "Bonus Action") return "bonusAction";
  if (castingTime.startsWith("Reaction")) return "reaction";
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
  const entry = getSpellRecordStrict(SPELL_LIBRARY, spellName);
  const castingTime = normalizeCastingTime(entry.castingTime);
  if (castingTime == null || castingTime === "reaction")
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

function canonicalModeledPreparedSpell(
  idOrName: string | SpellId,
): ModeledPreparedSpell | null {
  const record = getSpellRecord(SPELL_LIBRARY, idOrName);
  if (record == null) return null;
  const modeledName =
    record.id in MODELED_PREPARED_SPELL_INFO
      ? (record.id as ModeledPreparedSpell)
      : null;
  return modeledName;
}

export function getModeledPreparedSpellInfo(
  spellName: string | SpellId,
): ModeledPreparedSpellInfo | null {
  const canonical = canonicalModeledPreparedSpell(spellName);
  return canonical == null ? null : MODELED_PREPARED_SPELL_INFO[canonical];
}

export function getSpellComponentRequirements(
  spellName: string | SpellId,
): SpellComponentRequirements | null {
  const entry = getSpellRecord(SPELL_LIBRARY, spellName);
  return entry == null
    ? null
    : parseSpellComponentRequirements(entry.components);
}

export function getBattleReadyableSpellPayload(
  spellName: string | SpellId,
  slotLevel: SpellSlotLevel,
  saveDC: DifficultyClass = DEFAULT_BATTLE_SPELL_SAVE_DC,
): BattleReadyableSpellPayload | null {
  return projectBattleReadyableSpellPayload(spellName, slotLevel, saveDC);
}

export function getBattleReadyableSpellPayloadForSlots(
  spellName: string | SpellId,
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
  preparedSpells: ReadonlySet<SpellId>,
  slotsCurrent: ReadonlyArray<number>,
  spellSaveDcBySpell?: ReadonlyMap<SpellId, DifficultyClass>,
): ReadonlyMap<SpellId, BattleReadyableSpellPayload> {
  const payloads = new Map<SpellId, BattleReadyableSpellPayload>();
  for (const spellId of preparedSpells) {
    const modeled = getModeledPreparedSpellInfo(spellId);
    if (modeled == null || modeled.castingTime !== "action") continue;
    const mechanics = getBattleReadyableSpellMechanics(spellId);
    if (mechanics == null) continue;
    const payload = getBattleReadyableSpellPayloadForSlots(
      spellId,
      mechanics.baseLevel,
      slotsCurrent,
      spellSaveDcBySpell?.get(spellId),
    );
    if (payload != null) payloads.set(spellId, payload);
  }
  return payloads;
}

export function defaultPreparedSpellsForClassLevels(
  classLevels: Readonly<Partial<Record<ClassName, number>>>,
  slotsMax: ReadonlyArray<number>,
): ReadonlySet<SpellId> {
  const highestSlotLevel = slotsMax.reduce(
    (current, count, index) => (count > 0 ? index + 1 : current),
    0,
  );
  const prepared = new Set<SpellId>();
  for (const [className, spells] of Object.entries(
    MODELED_PREPARED_SPELLS_BY_CLASS,
  ) as ReadonlyArray<
    readonly [ClassName, ReadonlyArray<ModeledPreparedSpell>]
  >) {
    if ((classLevels[className] ?? 0) <= 0) continue;
    for (const spellName of spells) {
      if (MODELED_PREPARED_SPELL_INFO[spellName].baseLevel <= highestSlotLevel)
        prepared.add(spellId(spellName));
    }
  }
  return prepared;
}
