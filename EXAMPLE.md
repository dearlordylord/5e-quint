# Character Example Walkthrough

This file is a concrete worked example of the current character pipeline using
the fighter preset from
[packages/app/src/components/character-creation/characterCreationPresets.ts](./packages/app/src/components/character-creation/characterCreationPresets.ts).

The point is not to explain every helper implementation detail. The point is to
show one exact authored character flowing through the current domain boundary:

1. `CharacterDraft`
2. `CharacterDraftAssessment`
3. `CharacterSheet`
4. `CharacterCreatureProjection`
5. machine/battle-facing projections

## 1. Input Draft

The preset draft is:

```ts
const FIGHTER_EXAMPLE_DRAFT: CharacterDraft = {
  primaryClass: "fighter",
  advancement: [{ className: "fighter" }],
  background: "soldier",
  abilityScoreGeneration: {
    mode: "standardArray",
    assignedScores: {
      str: 15,
      dex: 13,
      con: 14,
      int: 8,
      wis: 10,
      cha: 12,
    },
  },
  backgroundAbilityScoreIncrease: {
    kind: "plusTwoPlusOne",
    plusTwo: "str",
    plusOne: "con",
  },
  species: "human",
  languages: ["Common", "Dwarvish", "Elvish"],
  alignment: "NG",
  choices: {
    primaryClassSkills: ["acrobatics", "perception"],
    backgroundTool: "dice",
    speciesSkill: "stealth",
    humanOriginFeat: { feat: "alert" },
  },
  equipment: {
    backgroundOption: "package",
    classOption: "packageA",
    purchasedCombatEquipment: [],
    remainingGoldPieces: 18,
    loadout: {
      wieldedWeapon: "greatsword",
      wieldedWeaponGrip: "twoHanded",
    },
  },
}
```

What is authored here:

- class and advancement history;
- background, species, languages, alignment;
- assigned ability scores and chosen background increase;
- chosen skills/tool/origin feat;
- chosen equipment options and actual combat loadout.

What is not authored here:

- final ability modifiers;
- HP, AC, initiative, passive Perception;
- creature-runtime flags;
- battle-runtime payloads.

## 2. Assessment

`assessCharacterDraft(FIGHTER_EXAMPLE_DRAFT)` returns a complete assessment.

Semantically:

- `openChoices = []`
- `issues = []`
- `status = "complete"`
- `sheet` is present

Why it is complete:

- level-1 advancement is present;
- primary class is consistent with advancement;
- standard-array assignment is valid;
- soldier background increase `+2 str, +1 con` is valid;
- human-required origin feat is present;
- fighter-required class skill choices are present;
- soldier-required gaming set choice is present;
- human species skill choice is present;
- equipment choice and loadout are valid.

## 3. Finalized Sheet

`finalizeCharacterDraft(FIGHTER_EXAMPLE_DRAFT)` succeeds and yields this
canonical `CharacterSheet` in substance:

```ts
{
  primaryClass: "fighter",
  advancement: [{ className: "fighter" }],
  classLevels: {
    barbarian: 0,
    bard: 0,
    cleric: 0,
    druid: 0,
    fighter: 1,
    monk: 0,
    paladin: 0,
    ranger: 0,
    rogue: 0,
    sorcerer: 0,
    warlock: 0,
    wizard: 0,
  },
  background: "soldier",
  abilityScoreGeneration: {
    mode: "standardArray",
    assignedScores: {
      str: 15,
      dex: 13,
      con: 14,
      int: 8,
      wis: 10,
      cha: 12,
    },
  },
  backgroundAbilityScoreIncrease: {
    kind: "plusTwoPlusOne",
    plusTwo: "str",
    plusOne: "con",
  },
  abilityScores: {
    str: 17,
    dex: 13,
    con: 15,
    int: 8,
    wis: 10,
    cha: 12,
  },
  species: "human",
  languages: ["Common", "Dwarvish", "Elvish"],
  alignment: "NG",
  choices: {
    primaryClassSkills: ["acrobatics", "perception"],
    backgroundTool: "dice",
    speciesSkill: "stealth",
    humanOriginFeat: { feat: "alert" },
  },
  equipment: {
    backgroundOption: "package",
    classOption: "packageA",
    purchasedCombatEquipment: [],
    remainingGoldPieces: 18,
    loadout: {
      wieldedWeapon: "greatsword",
      wieldedWeaponGrip: "twoHanded",
    },
  },
}
```

Important observations:

- `abilityScores` are now final and canonical: the sheet owns `17/13/15/8/10/12`.
- `classLevels` are derived from `advancement`, but currently also stored on the
  sheet in TypeScript.
- The finalized sheet still owns authored choices. It does not yet own derived
  execution facts such as AC or HP.

## 4. Derived Sheet Numbers

`deriveCharacterSheetNumbers(sheet)` computes execution-facing numbers from the
canonical sheet.

For this fighter:

```ts
{
  proficiencyBonus: 2,
  maxHp: 12,
  hitDiceRemaining: {
    barbarian: 0,
    bard: 0,
    cleric: 0,
    druid: 0,
    fighter: 1,
    monk: 0,
    paladin: 0,
    ranger: 0,
    rogue: 0,
    sorcerer: 0,
    warlock: 0,
    wizard: 0,
  },
  armorClass: 11,
  baseWalkSpeed: 30,
  initiativeModifier: 1,
  initiativeScore: 11,
  savingThrowModifiers: {
    str: 5,
    dex: 1,
    con: 4,
    int: -1,
    wis: 0,
    cha: 1,
  },
  passivePerception: 12,
}
```

Why:

- fighter hit die is `d10`; level-1 HP is `10 + conMod(2) = 12`
- no armor and no shield means base AC is `10 + dexMod(1) = 11`
- proficiency bonus at total level 1 is `+2`
- fighter save proficiencies are `str` and `con`
- perception is proficient from chosen class skills, so passive Perception is
  `10 + (wisMod 0 + proficiency 2) = 12`

## 5. Character -> Creature Projection

`characterSheetCreatureProjection(sheet)` is the character-side handoff packet
into creature execution semantics.

For this fighter, in substance:

```ts
{
  primaryClass: "fighter",
  subclasses: [],
  species: "human",
  classLevels: { fighter: 1, all others: 0 },
  fightingStyles: new Set(),
  creatureSize: "medium",
  abilityScores: {
    str: 17,
    dex: 13,
    con: 15,
    int: 8,
    wis: 10,
    cha: 12,
  },
  baseWalkSpeed: 30,
  saveProficiencies: new Set(["str", "con"]),
  skillProficiencies: new Set([
    "athletics",
    "intimidation",
    "acrobatics",
    "perception",
    "stealth",
  ]),
  expertiseSkills: new Set(),
  armorProficiencies: new Set(["light", "medium", "heavy"]),
  hitDieType: 10,
  spellcastingAbility: "wis",
  hasSpellcasting: false,
  unarmoredDefense: "none",
  features: new Set(),
  critRange: 20,
  hasFightingStyleFeature: true,
}
```

Important observations:

- `subclasses` is empty because this is fighter level 1.
- `fightingStyles` is also empty, but **for a different reason**: the sheet does
  not yet own Fighting Style selections even though the projection shape already
  anticipates them.
- `hasFightingStyleFeature` is `true` because fighter level 1 grants access to
  that feature slot, even though the actual authored Fighting Style selection is
  not yet modeled on the character side.
- `expertiseSkills` is also empty today; this is another projection field whose
  character-side owner has not yet been completed.

## 6. Machine Input

`characterSheetMachineInput(sheet)` converts the finalized sheet into the
creature-machine-oriented runtime input.

For this fighter, the important fields are:

```ts
{
  maxHp: 12,
  conMod: 2,
  hitDiceRemaining: { fighter: 1, all others: 0 },
  baseWalkSpeed: 30,
  effectiveSpeed: 30,
  movementRemaining: 30,
  fighterLevel: 1,
  wisMod: 0,
  chaMod: 1,
  slotsMax: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  slotsCurrent: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  preparedSpells: new Set(),
  wearingArmorWithoutTraining: false,
}
```

This is not the authored character anymore. It is the creature-machine runtime
input derived from the authored sheet.

## 7. Battle Projection

`characterSheetBattleProjection(sheet)` converts the finalized sheet into the
battle-entry-facing payload.

For this fighter, the important facts are:

```ts
{
  maxHp: 12,
  baseArmorClass: 11,
  baseWalkSpeed: 30,
  strMod: 3,
  dexMod: 1,
  fighterLevel: 1,
  critRange: 20,
  sneakAttackDice: 0,
  mainHandWeapon: "greatsword",
  mainHandUsesTwoHands: true,
  hasShieldEquipped: false,
  isWearingArmor: false,
  preparedSpells: new Set(),
  readyableSpellPayloads: new Map(),
}
```

This is downstream of both:

- the canonical authored sheet;
- the intermediate character-creature projection.

## 8. Level-Up Reuse

If this fighter levels up, the repo does not switch to a second product model.

Instead:

1. start from the finalized `CharacterSheet`;
2. convert it back into `CharacterDraft` with `characterDraftFromSheet(sheet)`;
3. append one `CharacterLevelUpTransition`;
4. finalize again.

That is why level-1 creation and higher-level starts still live in one domain
family.

## 9. Current Gaps Visible In This Example

This one example already exposes some of the current planned follow-on work:

- Fighting Style is represented at the projection boundary but not yet owned on
  the character side.
- Expertise is also represented at the projection boundary but not yet owned or
  derived on the character side.
- Draft mutation is currently post-change sanitization, not preview-before-commit.
- The TypeScript result shapes around assessment/finalization are looser than
  the domain invariants they actually represent.
