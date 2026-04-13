// Auto-generated from packages/core/src/character-spellcasting-data.ts and packages/core/src/features/spell-registry.ts.
// Do not edit by hand; run `pnpm exec tsx scripts/generate-character-creation-spell-data.ts`.

module characterCreationSpellData {
  import creature.* from "./creature"

  pure def pBaseCantripChoiceCount(className: ClassName, level: int): int =
    if (className == Barbarian)
        if (level == 1) 0
        else if (level == 2) 0
        else if (level == 3) 0
        else if (level == 4) 0
        else if (level == 5) 0
        else if (level == 6) 0
        else if (level == 7) 0
        else if (level == 8) 0
        else if (level == 9) 0
        else if (level == 10) 0
        else if (level == 11) 0
        else if (level == 12) 0
        else if (level == 13) 0
        else if (level == 14) 0
        else if (level == 15) 0
        else if (level == 16) 0
        else if (level == 17) 0
        else if (level == 18) 0
        else if (level == 19) 0
        else if (level == 20) 0
        else 0
    else if (className == Bard)
        if (level == 1) 2
        else if (level == 2) 2
        else if (level == 3) 2
        else if (level == 4) 3
        else if (level == 5) 3
        else if (level == 6) 3
        else if (level == 7) 3
        else if (level == 8) 3
        else if (level == 9) 3
        else if (level == 10) 4
        else if (level == 11) 4
        else if (level == 12) 4
        else if (level == 13) 4
        else if (level == 14) 4
        else if (level == 15) 4
        else if (level == 16) 4
        else if (level == 17) 4
        else if (level == 18) 4
        else if (level == 19) 4
        else if (level == 20) 4
        else 0
    else if (className == Cleric)
        if (level == 1) 3
        else if (level == 2) 3
        else if (level == 3) 3
        else if (level == 4) 4
        else if (level == 5) 4
        else if (level == 6) 4
        else if (level == 7) 4
        else if (level == 8) 4
        else if (level == 9) 4
        else if (level == 10) 5
        else if (level == 11) 5
        else if (level == 12) 5
        else if (level == 13) 5
        else if (level == 14) 5
        else if (level == 15) 5
        else if (level == 16) 5
        else if (level == 17) 5
        else if (level == 18) 5
        else if (level == 19) 5
        else if (level == 20) 5
        else 0
    else if (className == Druid)
        if (level == 1) 2
        else if (level == 2) 2
        else if (level == 3) 2
        else if (level == 4) 3
        else if (level == 5) 3
        else if (level == 6) 3
        else if (level == 7) 3
        else if (level == 8) 3
        else if (level == 9) 3
        else if (level == 10) 4
        else if (level == 11) 4
        else if (level == 12) 4
        else if (level == 13) 4
        else if (level == 14) 4
        else if (level == 15) 4
        else if (level == 16) 4
        else if (level == 17) 4
        else if (level == 18) 4
        else if (level == 19) 4
        else if (level == 20) 4
        else 0
    else if (className == Fighter)
        if (level == 1) 0
        else if (level == 2) 0
        else if (level == 3) 0
        else if (level == 4) 0
        else if (level == 5) 0
        else if (level == 6) 0
        else if (level == 7) 0
        else if (level == 8) 0
        else if (level == 9) 0
        else if (level == 10) 0
        else if (level == 11) 0
        else if (level == 12) 0
        else if (level == 13) 0
        else if (level == 14) 0
        else if (level == 15) 0
        else if (level == 16) 0
        else if (level == 17) 0
        else if (level == 18) 0
        else if (level == 19) 0
        else if (level == 20) 0
        else 0
    else if (className == Monk)
        if (level == 1) 0
        else if (level == 2) 0
        else if (level == 3) 0
        else if (level == 4) 0
        else if (level == 5) 0
        else if (level == 6) 0
        else if (level == 7) 0
        else if (level == 8) 0
        else if (level == 9) 0
        else if (level == 10) 0
        else if (level == 11) 0
        else if (level == 12) 0
        else if (level == 13) 0
        else if (level == 14) 0
        else if (level == 15) 0
        else if (level == 16) 0
        else if (level == 17) 0
        else if (level == 18) 0
        else if (level == 19) 0
        else if (level == 20) 0
        else 0
    else if (className == Paladin)
        if (level == 1) 0
        else if (level == 2) 0
        else if (level == 3) 0
        else if (level == 4) 0
        else if (level == 5) 0
        else if (level == 6) 0
        else if (level == 7) 0
        else if (level == 8) 0
        else if (level == 9) 0
        else if (level == 10) 0
        else if (level == 11) 0
        else if (level == 12) 0
        else if (level == 13) 0
        else if (level == 14) 0
        else if (level == 15) 0
        else if (level == 16) 0
        else if (level == 17) 0
        else if (level == 18) 0
        else if (level == 19) 0
        else if (level == 20) 0
        else 0
    else if (className == Ranger)
        if (level == 1) 0
        else if (level == 2) 0
        else if (level == 3) 0
        else if (level == 4) 0
        else if (level == 5) 0
        else if (level == 6) 0
        else if (level == 7) 0
        else if (level == 8) 0
        else if (level == 9) 0
        else if (level == 10) 0
        else if (level == 11) 0
        else if (level == 12) 0
        else if (level == 13) 0
        else if (level == 14) 0
        else if (level == 15) 0
        else if (level == 16) 0
        else if (level == 17) 0
        else if (level == 18) 0
        else if (level == 19) 0
        else if (level == 20) 0
        else 0
    else if (className == Rogue)
        if (level == 1) 0
        else if (level == 2) 0
        else if (level == 3) 0
        else if (level == 4) 0
        else if (level == 5) 0
        else if (level == 6) 0
        else if (level == 7) 0
        else if (level == 8) 0
        else if (level == 9) 0
        else if (level == 10) 0
        else if (level == 11) 0
        else if (level == 12) 0
        else if (level == 13) 0
        else if (level == 14) 0
        else if (level == 15) 0
        else if (level == 16) 0
        else if (level == 17) 0
        else if (level == 18) 0
        else if (level == 19) 0
        else if (level == 20) 0
        else 0
    else if (className == Sorcerer)
        if (level == 1) 4
        else if (level == 2) 4
        else if (level == 3) 4
        else if (level == 4) 5
        else if (level == 5) 5
        else if (level == 6) 5
        else if (level == 7) 5
        else if (level == 8) 5
        else if (level == 9) 5
        else if (level == 10) 6
        else if (level == 11) 6
        else if (level == 12) 6
        else if (level == 13) 6
        else if (level == 14) 6
        else if (level == 15) 6
        else if (level == 16) 6
        else if (level == 17) 6
        else if (level == 18) 6
        else if (level == 19) 6
        else if (level == 20) 6
        else 0
    else if (className == Warlock)
        if (level == 1) 2
        else if (level == 2) 2
        else if (level == 3) 2
        else if (level == 4) 3
        else if (level == 5) 3
        else if (level == 6) 3
        else if (level == 7) 3
        else if (level == 8) 3
        else if (level == 9) 3
        else if (level == 10) 4
        else if (level == 11) 4
        else if (level == 12) 4
        else if (level == 13) 4
        else if (level == 14) 4
        else if (level == 15) 4
        else if (level == 16) 4
        else if (level == 17) 4
        else if (level == 18) 4
        else if (level == 19) 4
        else if (level == 20) 4
        else 0
    else if (className == Wizard)
        if (level == 1) 3
        else if (level == 2) 3
        else if (level == 3) 3
        else if (level == 4) 4
        else if (level == 5) 4
        else if (level == 6) 4
        else if (level == 7) 4
        else if (level == 8) 4
        else if (level == 9) 4
        else if (level == 10) 5
        else if (level == 11) 5
        else if (level == 12) 5
        else if (level == 13) 5
        else if (level == 14) 5
        else if (level == 15) 5
        else if (level == 16) 5
        else if (level == 17) 5
        else if (level == 18) 5
        else if (level == 19) 5
        else if (level == 20) 5
        else 0
    else 0

  pure def pPreparedSpellChoiceCount(className: ClassName, level: int): int =
    if (className == Barbarian)
        if (level == 1) 0
        else if (level == 2) 0
        else if (level == 3) 0
        else if (level == 4) 0
        else if (level == 5) 0
        else if (level == 6) 0
        else if (level == 7) 0
        else if (level == 8) 0
        else if (level == 9) 0
        else if (level == 10) 0
        else if (level == 11) 0
        else if (level == 12) 0
        else if (level == 13) 0
        else if (level == 14) 0
        else if (level == 15) 0
        else if (level == 16) 0
        else if (level == 17) 0
        else if (level == 18) 0
        else if (level == 19) 0
        else if (level == 20) 0
        else 0
    else if (className == Bard)
        if (level == 1) 4
        else if (level == 2) 5
        else if (level == 3) 6
        else if (level == 4) 7
        else if (level == 5) 9
        else if (level == 6) 10
        else if (level == 7) 11
        else if (level == 8) 12
        else if (level == 9) 14
        else if (level == 10) 15
        else if (level == 11) 16
        else if (level == 12) 16
        else if (level == 13) 17
        else if (level == 14) 17
        else if (level == 15) 18
        else if (level == 16) 18
        else if (level == 17) 19
        else if (level == 18) 20
        else if (level == 19) 21
        else if (level == 20) 22
        else 0
    else if (className == Cleric)
        if (level == 1) 4
        else if (level == 2) 5
        else if (level == 3) 6
        else if (level == 4) 7
        else if (level == 5) 9
        else if (level == 6) 10
        else if (level == 7) 11
        else if (level == 8) 12
        else if (level == 9) 14
        else if (level == 10) 15
        else if (level == 11) 16
        else if (level == 12) 16
        else if (level == 13) 17
        else if (level == 14) 17
        else if (level == 15) 18
        else if (level == 16) 18
        else if (level == 17) 19
        else if (level == 18) 20
        else if (level == 19) 21
        else if (level == 20) 22
        else 0
    else if (className == Druid)
        if (level == 1) 4
        else if (level == 2) 5
        else if (level == 3) 6
        else if (level == 4) 7
        else if (level == 5) 9
        else if (level == 6) 10
        else if (level == 7) 11
        else if (level == 8) 12
        else if (level == 9) 14
        else if (level == 10) 15
        else if (level == 11) 16
        else if (level == 12) 16
        else if (level == 13) 17
        else if (level == 14) 17
        else if (level == 15) 18
        else if (level == 16) 18
        else if (level == 17) 19
        else if (level == 18) 20
        else if (level == 19) 21
        else if (level == 20) 22
        else 0
    else if (className == Fighter)
        if (level == 1) 0
        else if (level == 2) 0
        else if (level == 3) 0
        else if (level == 4) 0
        else if (level == 5) 0
        else if (level == 6) 0
        else if (level == 7) 0
        else if (level == 8) 0
        else if (level == 9) 0
        else if (level == 10) 0
        else if (level == 11) 0
        else if (level == 12) 0
        else if (level == 13) 0
        else if (level == 14) 0
        else if (level == 15) 0
        else if (level == 16) 0
        else if (level == 17) 0
        else if (level == 18) 0
        else if (level == 19) 0
        else if (level == 20) 0
        else 0
    else if (className == Monk)
        if (level == 1) 0
        else if (level == 2) 0
        else if (level == 3) 0
        else if (level == 4) 0
        else if (level == 5) 0
        else if (level == 6) 0
        else if (level == 7) 0
        else if (level == 8) 0
        else if (level == 9) 0
        else if (level == 10) 0
        else if (level == 11) 0
        else if (level == 12) 0
        else if (level == 13) 0
        else if (level == 14) 0
        else if (level == 15) 0
        else if (level == 16) 0
        else if (level == 17) 0
        else if (level == 18) 0
        else if (level == 19) 0
        else if (level == 20) 0
        else 0
    else if (className == Paladin)
        if (level == 1) 2
        else if (level == 2) 3
        else if (level == 3) 4
        else if (level == 4) 5
        else if (level == 5) 6
        else if (level == 6) 6
        else if (level == 7) 7
        else if (level == 8) 7
        else if (level == 9) 9
        else if (level == 10) 9
        else if (level == 11) 10
        else if (level == 12) 10
        else if (level == 13) 11
        else if (level == 14) 11
        else if (level == 15) 12
        else if (level == 16) 12
        else if (level == 17) 14
        else if (level == 18) 14
        else if (level == 19) 15
        else if (level == 20) 15
        else 0
    else if (className == Ranger)
        if (level == 1) 2
        else if (level == 2) 3
        else if (level == 3) 4
        else if (level == 4) 5
        else if (level == 5) 6
        else if (level == 6) 6
        else if (level == 7) 7
        else if (level == 8) 7
        else if (level == 9) 9
        else if (level == 10) 9
        else if (level == 11) 10
        else if (level == 12) 10
        else if (level == 13) 11
        else if (level == 14) 11
        else if (level == 15) 12
        else if (level == 16) 12
        else if (level == 17) 14
        else if (level == 18) 14
        else if (level == 19) 15
        else if (level == 20) 15
        else 0
    else if (className == Rogue)
        if (level == 1) 0
        else if (level == 2) 0
        else if (level == 3) 0
        else if (level == 4) 0
        else if (level == 5) 0
        else if (level == 6) 0
        else if (level == 7) 0
        else if (level == 8) 0
        else if (level == 9) 0
        else if (level == 10) 0
        else if (level == 11) 0
        else if (level == 12) 0
        else if (level == 13) 0
        else if (level == 14) 0
        else if (level == 15) 0
        else if (level == 16) 0
        else if (level == 17) 0
        else if (level == 18) 0
        else if (level == 19) 0
        else if (level == 20) 0
        else 0
    else if (className == Sorcerer)
        if (level == 1) 2
        else if (level == 2) 4
        else if (level == 3) 6
        else if (level == 4) 7
        else if (level == 5) 9
        else if (level == 6) 10
        else if (level == 7) 11
        else if (level == 8) 12
        else if (level == 9) 14
        else if (level == 10) 15
        else if (level == 11) 16
        else if (level == 12) 16
        else if (level == 13) 17
        else if (level == 14) 17
        else if (level == 15) 18
        else if (level == 16) 18
        else if (level == 17) 19
        else if (level == 18) 20
        else if (level == 19) 21
        else if (level == 20) 22
        else 0
    else if (className == Warlock)
        if (level == 1) 2
        else if (level == 2) 3
        else if (level == 3) 4
        else if (level == 4) 5
        else if (level == 5) 6
        else if (level == 6) 7
        else if (level == 7) 8
        else if (level == 8) 9
        else if (level == 9) 10
        else if (level == 10) 10
        else if (level == 11) 11
        else if (level == 12) 11
        else if (level == 13) 12
        else if (level == 14) 12
        else if (level == 15) 13
        else if (level == 16) 13
        else if (level == 17) 14
        else if (level == 18) 14
        else if (level == 19) 15
        else if (level == 20) 15
        else 0
    else if (className == Wizard)
        if (level == 1) 4
        else if (level == 2) 5
        else if (level == 3) 6
        else if (level == 4) 7
        else if (level == 5) 9
        else if (level == 6) 10
        else if (level == 7) 11
        else if (level == 8) 12
        else if (level == 9) 14
        else if (level == 10) 15
        else if (level == 11) 16
        else if (level == 12) 16
        else if (level == 13) 17
        else if (level == 14) 18
        else if (level == 15) 19
        else if (level == 16) 21
        else if (level == 17) 22
        else if (level == 18) 23
        else if (level == 19) 24
        else if (level == 20) 25
        else 0
    else 0

  pure def pWizardSpellbookCount(level: int): int =
    if (level <= 0) 0 else if (level == 1) 6
    else if (level == 2) 8
    else if (level == 3) 10
    else if (level == 4) 12
    else if (level == 5) 14
    else if (level == 6) 16
    else if (level == 7) 18
    else if (level == 8) 20
    else if (level == 9) 22
    else if (level == 10) 24
    else if (level == 11) 26
    else if (level == 12) 28
    else if (level == 13) 30
    else if (level == 14) 32
    else if (level == 15) 34
    else if (level == 16) 36
    else if (level == 17) 38
    else if (level == 18) 40
    else if (level == 19) 42
    else if (level == 20) 44
    else 0

  pure def pMaxSpellLevelForClass(className: ClassName, level: int): int =
    if (className == Barbarian)
        if (level == 1) 0
        else if (level == 2) 0
        else if (level == 3) 0
        else if (level == 4) 0
        else if (level == 5) 0
        else if (level == 6) 0
        else if (level == 7) 0
        else if (level == 8) 0
        else if (level == 9) 0
        else if (level == 10) 0
        else if (level == 11) 0
        else if (level == 12) 0
        else if (level == 13) 0
        else if (level == 14) 0
        else if (level == 15) 0
        else if (level == 16) 0
        else if (level == 17) 0
        else if (level == 18) 0
        else if (level == 19) 0
        else if (level == 20) 0
        else 0
    else if (className == Bard)
        if (level == 1) 1
        else if (level == 2) 1
        else if (level == 3) 2
        else if (level == 4) 2
        else if (level == 5) 3
        else if (level == 6) 3
        else if (level == 7) 4
        else if (level == 8) 4
        else if (level == 9) 5
        else if (level == 10) 5
        else if (level == 11) 6
        else if (level == 12) 6
        else if (level == 13) 7
        else if (level == 14) 7
        else if (level == 15) 8
        else if (level == 16) 8
        else if (level == 17) 9
        else if (level == 18) 9
        else if (level == 19) 9
        else if (level == 20) 9
        else 0
    else if (className == Cleric)
        if (level == 1) 1
        else if (level == 2) 1
        else if (level == 3) 2
        else if (level == 4) 2
        else if (level == 5) 3
        else if (level == 6) 3
        else if (level == 7) 4
        else if (level == 8) 4
        else if (level == 9) 5
        else if (level == 10) 5
        else if (level == 11) 6
        else if (level == 12) 6
        else if (level == 13) 7
        else if (level == 14) 7
        else if (level == 15) 8
        else if (level == 16) 8
        else if (level == 17) 9
        else if (level == 18) 9
        else if (level == 19) 9
        else if (level == 20) 9
        else 0
    else if (className == Druid)
        if (level == 1) 1
        else if (level == 2) 1
        else if (level == 3) 2
        else if (level == 4) 2
        else if (level == 5) 3
        else if (level == 6) 3
        else if (level == 7) 4
        else if (level == 8) 4
        else if (level == 9) 5
        else if (level == 10) 5
        else if (level == 11) 6
        else if (level == 12) 6
        else if (level == 13) 7
        else if (level == 14) 7
        else if (level == 15) 8
        else if (level == 16) 8
        else if (level == 17) 9
        else if (level == 18) 9
        else if (level == 19) 9
        else if (level == 20) 9
        else 0
    else if (className == Fighter)
        if (level == 1) 0
        else if (level == 2) 0
        else if (level == 3) 0
        else if (level == 4) 0
        else if (level == 5) 0
        else if (level == 6) 0
        else if (level == 7) 0
        else if (level == 8) 0
        else if (level == 9) 0
        else if (level == 10) 0
        else if (level == 11) 0
        else if (level == 12) 0
        else if (level == 13) 0
        else if (level == 14) 0
        else if (level == 15) 0
        else if (level == 16) 0
        else if (level == 17) 0
        else if (level == 18) 0
        else if (level == 19) 0
        else if (level == 20) 0
        else 0
    else if (className == Monk)
        if (level == 1) 0
        else if (level == 2) 0
        else if (level == 3) 0
        else if (level == 4) 0
        else if (level == 5) 0
        else if (level == 6) 0
        else if (level == 7) 0
        else if (level == 8) 0
        else if (level == 9) 0
        else if (level == 10) 0
        else if (level == 11) 0
        else if (level == 12) 0
        else if (level == 13) 0
        else if (level == 14) 0
        else if (level == 15) 0
        else if (level == 16) 0
        else if (level == 17) 0
        else if (level == 18) 0
        else if (level == 19) 0
        else if (level == 20) 0
        else 0
    else if (className == Paladin)
        if (level == 1) 0
        else if (level == 2) 1
        else if (level == 3) 1
        else if (level == 4) 1
        else if (level == 5) 2
        else if (level == 6) 2
        else if (level == 7) 2
        else if (level == 8) 2
        else if (level == 9) 3
        else if (level == 10) 3
        else if (level == 11) 3
        else if (level == 12) 3
        else if (level == 13) 4
        else if (level == 14) 4
        else if (level == 15) 4
        else if (level == 16) 4
        else if (level == 17) 5
        else if (level == 18) 5
        else if (level == 19) 5
        else if (level == 20) 5
        else 0
    else if (className == Ranger)
        if (level == 1) 0
        else if (level == 2) 1
        else if (level == 3) 1
        else if (level == 4) 1
        else if (level == 5) 2
        else if (level == 6) 2
        else if (level == 7) 2
        else if (level == 8) 2
        else if (level == 9) 3
        else if (level == 10) 3
        else if (level == 11) 3
        else if (level == 12) 3
        else if (level == 13) 4
        else if (level == 14) 4
        else if (level == 15) 4
        else if (level == 16) 4
        else if (level == 17) 5
        else if (level == 18) 5
        else if (level == 19) 5
        else if (level == 20) 5
        else 0
    else if (className == Rogue)
        if (level == 1) 0
        else if (level == 2) 0
        else if (level == 3) 0
        else if (level == 4) 0
        else if (level == 5) 0
        else if (level == 6) 0
        else if (level == 7) 0
        else if (level == 8) 0
        else if (level == 9) 0
        else if (level == 10) 0
        else if (level == 11) 0
        else if (level == 12) 0
        else if (level == 13) 0
        else if (level == 14) 0
        else if (level == 15) 0
        else if (level == 16) 0
        else if (level == 17) 0
        else if (level == 18) 0
        else if (level == 19) 0
        else if (level == 20) 0
        else 0
    else if (className == Sorcerer)
        if (level == 1) 1
        else if (level == 2) 1
        else if (level == 3) 2
        else if (level == 4) 2
        else if (level == 5) 3
        else if (level == 6) 3
        else if (level == 7) 4
        else if (level == 8) 4
        else if (level == 9) 5
        else if (level == 10) 5
        else if (level == 11) 6
        else if (level == 12) 6
        else if (level == 13) 7
        else if (level == 14) 7
        else if (level == 15) 8
        else if (level == 16) 8
        else if (level == 17) 9
        else if (level == 18) 9
        else if (level == 19) 9
        else if (level == 20) 9
        else 0
    else if (className == Warlock)
        if (level == 1) 1
        else if (level == 2) 1
        else if (level == 3) 2
        else if (level == 4) 2
        else if (level == 5) 3
        else if (level == 6) 3
        else if (level == 7) 4
        else if (level == 8) 4
        else if (level == 9) 5
        else if (level == 10) 5
        else if (level == 11) 5
        else if (level == 12) 5
        else if (level == 13) 5
        else if (level == 14) 5
        else if (level == 15) 5
        else if (level == 16) 5
        else if (level == 17) 5
        else if (level == 18) 5
        else if (level == 19) 5
        else if (level == 20) 5
        else 0
    else if (className == Wizard)
        if (level == 1) 1
        else if (level == 2) 1
        else if (level == 3) 2
        else if (level == 4) 2
        else if (level == 5) 3
        else if (level == 6) 3
        else if (level == 7) 4
        else if (level == 8) 4
        else if (level == 9) 5
        else if (level == 10) 5
        else if (level == 11) 6
        else if (level == 12) 6
        else if (level == 13) 7
        else if (level == 14) 7
        else if (level == 15) 8
        else if (level == 16) 8
        else if (level == 17) 9
        else if (level == 18) 9
        else if (level == 19) 9
        else if (level == 20) 9
        else 0
    else 0

  pure def pValidSubclassSelection(className: ClassName, subclass: str): bool =
    if (className == Barbarian) subclass == "berserker"
    else if (className == Bard) subclass == "lore"
    else if (className == Cleric) subclass == "life"
    else if (className == Druid) subclass == "land"
    else if (className == Fighter) subclass == "champion"
    else if (className == Monk) subclass == "openHand"
    else if (className == Paladin) subclass == "devotion"
    else if (className == Ranger) subclass == "hunter"
    else if (className == Rogue) subclass == "thief"
    else if (className == Sorcerer) subclass == "draconic"
    else if (className == Warlock) subclass == "fiend"
    else if (className == Wizard) subclass == "evoker"
    else false

  pure def pSpellExists(spellId: str): bool =
    if (spellId == "acid_arrow") true
    else if (spellId == "acid_splash") true
    else if (spellId == "aid") true
    else if (spellId == "alarm") true
    else if (spellId == "alter_self") true
    else if (spellId == "animal_friendship") true
    else if (spellId == "animal_messenger") true
    else if (spellId == "animal_shapes") true
    else if (spellId == "animate_dead") true
    else if (spellId == "animate_objects") true
    else if (spellId == "antilife_shell") true
    else if (spellId == "antimagic_field") true
    else if (spellId == "antipathy_sympathy") true
    else if (spellId == "arcane_eye") true
    else if (spellId == "arcane_hand") true
    else if (spellId == "arcane_lock") true
    else if (spellId == "arcane_sword") true
    else if (spellId == "arcanists_magic_aura") true
    else if (spellId == "astral_projection") true
    else if (spellId == "augury") true
    else if (spellId == "aura_of_life") true
    else if (spellId == "awaken") true
    else if (spellId == "bane") true
    else if (spellId == "banishment") true
    else if (spellId == "barkskin") true
    else if (spellId == "beacon_of_hope") true
    else if (spellId == "befuddlement") true
    else if (spellId == "bestow_curse") true
    else if (spellId == "black_tentacles") true
    else if (spellId == "blade_barrier") true
    else if (spellId == "bless") true
    else if (spellId == "blight") true
    else if (spellId == "blindness_deafness") true
    else if (spellId == "blink") true
    else if (spellId == "blur") true
    else if (spellId == "burning_hands") true
    else if (spellId == "call_lightning") true
    else if (spellId == "calm_emotions") true
    else if (spellId == "chain_lightning") true
    else if (spellId == "charm_monster") true
    else if (spellId == "charm_person") true
    else if (spellId == "chill_touch") true
    else if (spellId == "chromatic_orb") true
    else if (spellId == "circle_of_death") true
    else if (spellId == "clairvoyance") true
    else if (spellId == "clone") true
    else if (spellId == "cloudkill") true
    else if (spellId == "color_spray") true
    else if (spellId == "command") true
    else if (spellId == "commune") true
    else if (spellId == "commune_with_nature") true
    else if (spellId == "comprehend_languages") true
    else if (spellId == "compulsion") true
    else if (spellId == "cone_of_cold") true
    else if (spellId == "confusion") true
    else if (spellId == "conjure_animals") true
    else if (spellId == "conjure_celestial") true
    else if (spellId == "conjure_elemental") true
    else if (spellId == "conjure_fey") true
    else if (spellId == "conjure_minor_elementals") true
    else if (spellId == "conjure_woodland_beings") true
    else if (spellId == "contact_other_plane") true
    else if (spellId == "contagion") true
    else if (spellId == "contingency") true
    else if (spellId == "continual_flame") true
    else if (spellId == "control_water") true
    else if (spellId == "control_weather") true
    else if (spellId == "counterspell") true
    else if (spellId == "create_food_and_water") true
    else if (spellId == "create_or_destroy_water") true
    else if (spellId == "create_undead") true
    else if (spellId == "creation") true
    else if (spellId == "cure_wounds") true
    else if (spellId == "dancing_lights") true
    else if (spellId == "darkness") true
    else if (spellId == "darkvision") true
    else if (spellId == "daylight") true
    else if (spellId == "death_ward") true
    else if (spellId == "delayed_blast_fireball") true
    else if (spellId == "demiplane") true
    else if (spellId == "detect_evil_and_good") true
    else if (spellId == "detect_magic") true
    else if (spellId == "detect_poison_and_disease") true
    else if (spellId == "detect_thoughts") true
    else if (spellId == "dimension_door") true
    else if (spellId == "disguise_self") true
    else if (spellId == "disintegrate") true
    else if (spellId == "dispel_evil_and_good") true
    else if (spellId == "dispel_magic") true
    else if (spellId == "dissonant_whispers") true
    else if (spellId == "divination") true
    else if (spellId == "divine_favor") true
    else if (spellId == "divine_smite") true
    else if (spellId == "divine_word") true
    else if (spellId == "dominate_beast") true
    else if (spellId == "dominate_monster") true
    else if (spellId == "dominate_person") true
    else if (spellId == "dragons_breath") true
    else if (spellId == "dream") true
    else if (spellId == "druidcraft") true
    else if (spellId == "earthquake") true
    else if (spellId == "eldritch_blast") true
    else if (spellId == "elementalism") true
    else if (spellId == "enhance_ability") true
    else if (spellId == "enlarge_reduce") true
    else if (spellId == "ensnaring_strike") true
    else if (spellId == "entangle") true
    else if (spellId == "enthrall") true
    else if (spellId == "etherealness") true
    else if (spellId == "expeditious_retreat") true
    else if (spellId == "eyebite") true
    else if (spellId == "fabricate") true
    else if (spellId == "faerie_fire") true
    else if (spellId == "faithful_hound") true
    else if (spellId == "false_life") true
    else if (spellId == "fear") true
    else if (spellId == "feather_fall") true
    else if (spellId == "find_familiar") true
    else if (spellId == "find_steed") true
    else if (spellId == "find_the_path") true
    else if (spellId == "find_traps") true
    else if (spellId == "finger_of_death") true
    else if (spellId == "fire_bolt") true
    else if (spellId == "fire_shield") true
    else if (spellId == "fire_storm") true
    else if (spellId == "fireball") true
    else if (spellId == "flame_blade") true
    else if (spellId == "flame_strike") true
    else if (spellId == "flaming_sphere") true
    else if (spellId == "flesh_to_stone") true
    else if (spellId == "floating_disk") true
    else if (spellId == "fly") true
    else if (spellId == "fog_cloud") true
    else if (spellId == "forbiddance") true
    else if (spellId == "forcecage") true
    else if (spellId == "foresight") true
    else if (spellId == "freedom_of_movement") true
    else if (spellId == "freezing_sphere") true
    else if (spellId == "gaseous_form") true
    else if (spellId == "gate") true
    else if (spellId == "geas") true
    else if (spellId == "gentle_repose") true
    else if (spellId == "giant_insect") true
    else if (spellId == "glibness") true
    else if (spellId == "globe_of_invulnerability") true
    else if (spellId == "glyph_of_warding") true
    else if (spellId == "goodberry") true
    else if (spellId == "grease") true
    else if (spellId == "greater_invisibility") true
    else if (spellId == "greater_restoration") true
    else if (spellId == "guardian_of_faith") true
    else if (spellId == "guards_and_wards") true
    else if (spellId == "guidance") true
    else if (spellId == "guiding_bolt") true
    else if (spellId == "gust_of_wind") true
    else if (spellId == "hallow") true
    else if (spellId == "hallucinatory_terrain") true
    else if (spellId == "harm") true
    else if (spellId == "haste") true
    else if (spellId == "heal") true
    else if (spellId == "healing_word") true
    else if (spellId == "heat_metal") true
    else if (spellId == "hellish_rebuke") true
    else if (spellId == "heroes_feast") true
    else if (spellId == "heroism") true
    else if (spellId == "hex") true
    else if (spellId == "hideous_laughter") true
    else if (spellId == "hold_monster") true
    else if (spellId == "hold_person") true
    else if (spellId == "holy_aura") true
    else if (spellId == "hunters_mark") true
    else if (spellId == "hypnotic_pattern") true
    else if (spellId == "ice_knife") true
    else if (spellId == "ice_storm") true
    else if (spellId == "identify") true
    else if (spellId == "illusory_script") true
    else if (spellId == "imprisonment") true
    else if (spellId == "incendiary_cloud") true
    else if (spellId == "inflict_wounds") true
    else if (spellId == "insect_plague") true
    else if (spellId == "instant_summons") true
    else if (spellId == "invisibility") true
    else if (spellId == "irresistible_dance") true
    else if (spellId == "jump") true
    else if (spellId == "knock") true
    else if (spellId == "legend_lore") true
    else if (spellId == "lesser_restoration") true
    else if (spellId == "levitate") true
    else if (spellId == "light") true
    else if (spellId == "lightning_bolt") true
    else if (spellId == "locate_animals_or_plants") true
    else if (spellId == "locate_creature") true
    else if (spellId == "locate_object") true
    else if (spellId == "longstrider") true
    else if (spellId == "mage_armor") true
    else if (spellId == "mage_hand") true
    else if (spellId == "magic_circle") true
    else if (spellId == "magic_jar") true
    else if (spellId == "magic_missile") true
    else if (spellId == "magic_mouth") true
    else if (spellId == "magic_weapon") true
    else if (spellId == "magnificent_mansion") true
    else if (spellId == "major_image") true
    else if (spellId == "mass_cure_wounds") true
    else if (spellId == "mass_heal") true
    else if (spellId == "mass_healing_word") true
    else if (spellId == "mass_suggestion") true
    else if (spellId == "maze") true
    else if (spellId == "meld_into_stone") true
    else if (spellId == "mending") true
    else if (spellId == "message") true
    else if (spellId == "meteor_swarm") true
    else if (spellId == "mind_blank") true
    else if (spellId == "mind_spike") true
    else if (spellId == "minor_illusion") true
    else if (spellId == "mirage_arcane") true
    else if (spellId == "mirror_image") true
    else if (spellId == "mislead") true
    else if (spellId == "misty_step") true
    else if (spellId == "modify_memory") true
    else if (spellId == "moonbeam") true
    else if (spellId == "move_earth") true
    else if (spellId == "nondetection") true
    else if (spellId == "pass_without_trace") true
    else if (spellId == "passwall") true
    else if (spellId == "phantasmal_force") true
    else if (spellId == "phantasmal_killer") true
    else if (spellId == "phantom_steed") true
    else if (spellId == "planar_ally") true
    else if (spellId == "planar_binding") true
    else if (spellId == "plane_shift") true
    else if (spellId == "plant_growth") true
    else if (spellId == "poison_spray") true
    else if (spellId == "polymorph") true
    else if (spellId == "power_word_heal") true
    else if (spellId == "power_word_kill") true
    else if (spellId == "power_word_stun") true
    else if (spellId == "prayer_of_healing") true
    else if (spellId == "prestidigitation") true
    else if (spellId == "prismatic_spray") true
    else if (spellId == "prismatic_wall") true
    else if (spellId == "private_sanctum") true
    else if (spellId == "produce_flame") true
    else if (spellId == "programmed_illusion") true
    else if (spellId == "project_image") true
    else if (spellId == "protection_from_energy") true
    else if (spellId == "protection_from_evil_and_good") true
    else if (spellId == "protection_from_poison") true
    else if (spellId == "purify_food_and_drink") true
    else if (spellId == "raise_dead") true
    else if (spellId == "ray_of_enfeeblement") true
    else if (spellId == "ray_of_frost") true
    else if (spellId == "ray_of_sickness") true
    else if (spellId == "regenerate") true
    else if (spellId == "reincarnate") true
    else if (spellId == "remove_curse") true
    else if (spellId == "resilient_sphere") true
    else if (spellId == "resistance") true
    else if (spellId == "resurrection") true
    else if (spellId == "reverse_gravity") true
    else if (spellId == "revivify") true
    else if (spellId == "rope_trick") true
    else if (spellId == "sacred_flame") true
    else if (spellId == "sanctuary") true
    else if (spellId == "scorching_ray") true
    else if (spellId == "scrying") true
    else if (spellId == "searing_smite") true
    else if (spellId == "secret_chest") true
    else if (spellId == "see_invisibility") true
    else if (spellId == "seeming") true
    else if (spellId == "sending") true
    else if (spellId == "sequester") true
    else if (spellId == "shapechange") true
    else if (spellId == "shatter") true
    else if (spellId == "shield") true
    else if (spellId == "shield_of_faith") true
    else if (spellId == "shillelagh") true
    else if (spellId == "shining_smite") true
    else if (spellId == "shocking_grasp") true
    else if (spellId == "silence") true
    else if (spellId == "silent_image") true
    else if (spellId == "simulacrum") true
    else if (spellId == "sleep") true
    else if (spellId == "sleet_storm") true
    else if (spellId == "slow") true
    else if (spellId == "sorcerous_burst") true
    else if (spellId == "spare_the_dying") true
    else if (spellId == "speak_with_animals") true
    else if (spellId == "speak_with_dead") true
    else if (spellId == "speak_with_plants") true
    else if (spellId == "spider_climb") true
    else if (spellId == "spike_growth") true
    else if (spellId == "spirit_guardians") true
    else if (spellId == "spiritual_weapon") true
    else if (spellId == "starry_wisp") true
    else if (spellId == "stinking_cloud") true
    else if (spellId == "stone_shape") true
    else if (spellId == "stoneskin") true
    else if (spellId == "storm_of_vengeance") true
    else if (spellId == "suggestion") true
    else if (spellId == "summon_dragon") true
    else if (spellId == "sunbeam") true
    else if (spellId == "sunburst") true
    else if (spellId == "symbol") true
    else if (spellId == "telekinesis") true
    else if (spellId == "telepathic_bond") true
    else if (spellId == "teleport") true
    else if (spellId == "teleportation_circle") true
    else if (spellId == "thaumaturgy") true
    else if (spellId == "thunderwave") true
    else if (spellId == "time_stop") true
    else if (spellId == "tiny_hut") true
    else if (spellId == "tongues") true
    else if (spellId == "transport_via_plants") true
    else if (spellId == "tree_stride") true
    else if (spellId == "true_polymorph") true
    else if (spellId == "true_resurrection") true
    else if (spellId == "true_seeing") true
    else if (spellId == "true_strike") true
    else if (spellId == "tsunami") true
    else if (spellId == "unseen_servant") true
    else if (spellId == "vampiric_touch") true
    else if (spellId == "vicious_mockery") true
    else if (spellId == "vitriolic_sphere") true
    else if (spellId == "wall_of_fire") true
    else if (spellId == "wall_of_force") true
    else if (spellId == "wall_of_ice") true
    else if (spellId == "wall_of_stone") true
    else if (spellId == "wall_of_thorns") true
    else if (spellId == "warding_bond") true
    else if (spellId == "water_breathing") true
    else if (spellId == "water_walk") true
    else if (spellId == "web") true
    else if (spellId == "weird") true
    else if (spellId == "wind_walk") true
    else if (spellId == "wind_wall") true
    else if (spellId == "wish") true
    else if (spellId == "word_of_recall") true
    else if (spellId == "zone_of_truth") true
    else false

  pure def pSpellLevel(spellId: str): int =
    if (spellId == "acid_arrow") 2
    else if (spellId == "acid_splash") 0
    else if (spellId == "aid") 2
    else if (spellId == "alarm") 1
    else if (spellId == "alter_self") 2
    else if (spellId == "animal_friendship") 1
    else if (spellId == "animal_messenger") 2
    else if (spellId == "animal_shapes") 8
    else if (spellId == "animate_dead") 3
    else if (spellId == "animate_objects") 5
    else if (spellId == "antilife_shell") 5
    else if (spellId == "antimagic_field") 8
    else if (spellId == "antipathy_sympathy") 8
    else if (spellId == "arcane_eye") 4
    else if (spellId == "arcane_hand") 5
    else if (spellId == "arcane_lock") 2
    else if (spellId == "arcane_sword") 7
    else if (spellId == "arcanists_magic_aura") 2
    else if (spellId == "astral_projection") 9
    else if (spellId == "augury") 2
    else if (spellId == "aura_of_life") 4
    else if (spellId == "awaken") 5
    else if (spellId == "bane") 1
    else if (spellId == "banishment") 4
    else if (spellId == "barkskin") 2
    else if (spellId == "beacon_of_hope") 3
    else if (spellId == "befuddlement") 8
    else if (spellId == "bestow_curse") 3
    else if (spellId == "black_tentacles") 4
    else if (spellId == "blade_barrier") 6
    else if (spellId == "bless") 1
    else if (spellId == "blight") 4
    else if (spellId == "blindness_deafness") 2
    else if (spellId == "blink") 3
    else if (spellId == "blur") 2
    else if (spellId == "burning_hands") 1
    else if (spellId == "call_lightning") 3
    else if (spellId == "calm_emotions") 2
    else if (spellId == "chain_lightning") 6
    else if (spellId == "charm_monster") 4
    else if (spellId == "charm_person") 1
    else if (spellId == "chill_touch") 0
    else if (spellId == "chromatic_orb") 1
    else if (spellId == "circle_of_death") 6
    else if (spellId == "clairvoyance") 3
    else if (spellId == "clone") 8
    else if (spellId == "cloudkill") 5
    else if (spellId == "color_spray") 1
    else if (spellId == "command") 1
    else if (spellId == "commune") 5
    else if (spellId == "commune_with_nature") 5
    else if (spellId == "comprehend_languages") 1
    else if (spellId == "compulsion") 4
    else if (spellId == "cone_of_cold") 5
    else if (spellId == "confusion") 4
    else if (spellId == "conjure_animals") 3
    else if (spellId == "conjure_celestial") 7
    else if (spellId == "conjure_elemental") 5
    else if (spellId == "conjure_fey") 6
    else if (spellId == "conjure_minor_elementals") 4
    else if (spellId == "conjure_woodland_beings") 4
    else if (spellId == "contact_other_plane") 5
    else if (spellId == "contagion") 5
    else if (spellId == "contingency") 6
    else if (spellId == "continual_flame") 2
    else if (spellId == "control_water") 4
    else if (spellId == "control_weather") 8
    else if (spellId == "counterspell") 3
    else if (spellId == "create_food_and_water") 3
    else if (spellId == "create_or_destroy_water") 1
    else if (spellId == "create_undead") 6
    else if (spellId == "creation") 5
    else if (spellId == "cure_wounds") 1
    else if (spellId == "dancing_lights") 0
    else if (spellId == "darkness") 2
    else if (spellId == "darkvision") 2
    else if (spellId == "daylight") 3
    else if (spellId == "death_ward") 4
    else if (spellId == "delayed_blast_fireball") 7
    else if (spellId == "demiplane") 8
    else if (spellId == "detect_evil_and_good") 1
    else if (spellId == "detect_magic") 1
    else if (spellId == "detect_poison_and_disease") 1
    else if (spellId == "detect_thoughts") 2
    else if (spellId == "dimension_door") 4
    else if (spellId == "disguise_self") 1
    else if (spellId == "disintegrate") 6
    else if (spellId == "dispel_evil_and_good") 5
    else if (spellId == "dispel_magic") 3
    else if (spellId == "dissonant_whispers") 1
    else if (spellId == "divination") 4
    else if (spellId == "divine_favor") 1
    else if (spellId == "divine_smite") 1
    else if (spellId == "divine_word") 7
    else if (spellId == "dominate_beast") 4
    else if (spellId == "dominate_monster") 8
    else if (spellId == "dominate_person") 5
    else if (spellId == "dragons_breath") 2
    else if (spellId == "dream") 5
    else if (spellId == "druidcraft") 0
    else if (spellId == "earthquake") 8
    else if (spellId == "eldritch_blast") 0
    else if (spellId == "elementalism") 0
    else if (spellId == "enhance_ability") 2
    else if (spellId == "enlarge_reduce") 2
    else if (spellId == "ensnaring_strike") 1
    else if (spellId == "entangle") 1
    else if (spellId == "enthrall") 2
    else if (spellId == "etherealness") 7
    else if (spellId == "expeditious_retreat") 1
    else if (spellId == "eyebite") 6
    else if (spellId == "fabricate") 4
    else if (spellId == "faerie_fire") 1
    else if (spellId == "faithful_hound") 4
    else if (spellId == "false_life") 1
    else if (spellId == "fear") 3
    else if (spellId == "feather_fall") 1
    else if (spellId == "find_familiar") 1
    else if (spellId == "find_steed") 2
    else if (spellId == "find_the_path") 6
    else if (spellId == "find_traps") 2
    else if (spellId == "finger_of_death") 7
    else if (spellId == "fire_bolt") 0
    else if (spellId == "fire_shield") 4
    else if (spellId == "fire_storm") 7
    else if (spellId == "fireball") 3
    else if (spellId == "flame_blade") 2
    else if (spellId == "flame_strike") 5
    else if (spellId == "flaming_sphere") 2
    else if (spellId == "flesh_to_stone") 6
    else if (spellId == "floating_disk") 1
    else if (spellId == "fly") 3
    else if (spellId == "fog_cloud") 1
    else if (spellId == "forbiddance") 6
    else if (spellId == "forcecage") 7
    else if (spellId == "foresight") 9
    else if (spellId == "freedom_of_movement") 4
    else if (spellId == "freezing_sphere") 6
    else if (spellId == "gaseous_form") 3
    else if (spellId == "gate") 9
    else if (spellId == "geas") 5
    else if (spellId == "gentle_repose") 2
    else if (spellId == "giant_insect") 4
    else if (spellId == "glibness") 8
    else if (spellId == "globe_of_invulnerability") 6
    else if (spellId == "glyph_of_warding") 3
    else if (spellId == "goodberry") 1
    else if (spellId == "grease") 1
    else if (spellId == "greater_invisibility") 4
    else if (spellId == "greater_restoration") 5
    else if (spellId == "guardian_of_faith") 4
    else if (spellId == "guards_and_wards") 6
    else if (spellId == "guidance") 0
    else if (spellId == "guiding_bolt") 1
    else if (spellId == "gust_of_wind") 2
    else if (spellId == "hallow") 5
    else if (spellId == "hallucinatory_terrain") 4
    else if (spellId == "harm") 6
    else if (spellId == "haste") 3
    else if (spellId == "heal") 6
    else if (spellId == "healing_word") 1
    else if (spellId == "heat_metal") 2
    else if (spellId == "hellish_rebuke") 1
    else if (spellId == "heroes_feast") 6
    else if (spellId == "heroism") 1
    else if (spellId == "hex") 1
    else if (spellId == "hideous_laughter") 1
    else if (spellId == "hold_monster") 5
    else if (spellId == "hold_person") 2
    else if (spellId == "holy_aura") 8
    else if (spellId == "hunters_mark") 1
    else if (spellId == "hypnotic_pattern") 3
    else if (spellId == "ice_knife") 1
    else if (spellId == "ice_storm") 4
    else if (spellId == "identify") 1
    else if (spellId == "illusory_script") 1
    else if (spellId == "imprisonment") 9
    else if (spellId == "incendiary_cloud") 8
    else if (spellId == "inflict_wounds") 1
    else if (spellId == "insect_plague") 5
    else if (spellId == "instant_summons") 6
    else if (spellId == "invisibility") 2
    else if (spellId == "irresistible_dance") 6
    else if (spellId == "jump") 1
    else if (spellId == "knock") 2
    else if (spellId == "legend_lore") 5
    else if (spellId == "lesser_restoration") 2
    else if (spellId == "levitate") 2
    else if (spellId == "light") 0
    else if (spellId == "lightning_bolt") 3
    else if (spellId == "locate_animals_or_plants") 2
    else if (spellId == "locate_creature") 4
    else if (spellId == "locate_object") 2
    else if (spellId == "longstrider") 1
    else if (spellId == "mage_armor") 1
    else if (spellId == "mage_hand") 0
    else if (spellId == "magic_circle") 3
    else if (spellId == "magic_jar") 6
    else if (spellId == "magic_missile") 1
    else if (spellId == "magic_mouth") 2
    else if (spellId == "magic_weapon") 2
    else if (spellId == "magnificent_mansion") 7
    else if (spellId == "major_image") 3
    else if (spellId == "mass_cure_wounds") 5
    else if (spellId == "mass_heal") 9
    else if (spellId == "mass_healing_word") 3
    else if (spellId == "mass_suggestion") 6
    else if (spellId == "maze") 8
    else if (spellId == "meld_into_stone") 3
    else if (spellId == "mending") 0
    else if (spellId == "message") 0
    else if (spellId == "meteor_swarm") 9
    else if (spellId == "mind_blank") 8
    else if (spellId == "mind_spike") 2
    else if (spellId == "minor_illusion") 0
    else if (spellId == "mirage_arcane") 7
    else if (spellId == "mirror_image") 2
    else if (spellId == "mislead") 5
    else if (spellId == "misty_step") 2
    else if (spellId == "modify_memory") 5
    else if (spellId == "moonbeam") 2
    else if (spellId == "move_earth") 6
    else if (spellId == "nondetection") 3
    else if (spellId == "pass_without_trace") 2
    else if (spellId == "passwall") 5
    else if (spellId == "phantasmal_force") 2
    else if (spellId == "phantasmal_killer") 4
    else if (spellId == "phantom_steed") 3
    else if (spellId == "planar_ally") 6
    else if (spellId == "planar_binding") 5
    else if (spellId == "plane_shift") 7
    else if (spellId == "plant_growth") 3
    else if (spellId == "poison_spray") 0
    else if (spellId == "polymorph") 4
    else if (spellId == "power_word_heal") 9
    else if (spellId == "power_word_kill") 9
    else if (spellId == "power_word_stun") 8
    else if (spellId == "prayer_of_healing") 2
    else if (spellId == "prestidigitation") 0
    else if (spellId == "prismatic_spray") 7
    else if (spellId == "prismatic_wall") 9
    else if (spellId == "private_sanctum") 4
    else if (spellId == "produce_flame") 0
    else if (spellId == "programmed_illusion") 6
    else if (spellId == "project_image") 7
    else if (spellId == "protection_from_energy") 3
    else if (spellId == "protection_from_evil_and_good") 1
    else if (spellId == "protection_from_poison") 2
    else if (spellId == "purify_food_and_drink") 1
    else if (spellId == "raise_dead") 5
    else if (spellId == "ray_of_enfeeblement") 2
    else if (spellId == "ray_of_frost") 0
    else if (spellId == "ray_of_sickness") 1
    else if (spellId == "regenerate") 7
    else if (spellId == "reincarnate") 5
    else if (spellId == "remove_curse") 3
    else if (spellId == "resilient_sphere") 4
    else if (spellId == "resistance") 0
    else if (spellId == "resurrection") 7
    else if (spellId == "reverse_gravity") 7
    else if (spellId == "revivify") 3
    else if (spellId == "rope_trick") 2
    else if (spellId == "sacred_flame") 0
    else if (spellId == "sanctuary") 1
    else if (spellId == "scorching_ray") 2
    else if (spellId == "scrying") 5
    else if (spellId == "searing_smite") 1
    else if (spellId == "secret_chest") 4
    else if (spellId == "see_invisibility") 2
    else if (spellId == "seeming") 5
    else if (spellId == "sending") 3
    else if (spellId == "sequester") 7
    else if (spellId == "shapechange") 9
    else if (spellId == "shatter") 2
    else if (spellId == "shield") 1
    else if (spellId == "shield_of_faith") 1
    else if (spellId == "shillelagh") 0
    else if (spellId == "shining_smite") 2
    else if (spellId == "shocking_grasp") 0
    else if (spellId == "silence") 2
    else if (spellId == "silent_image") 1
    else if (spellId == "simulacrum") 7
    else if (spellId == "sleep") 1
    else if (spellId == "sleet_storm") 3
    else if (spellId == "slow") 3
    else if (spellId == "sorcerous_burst") 0
    else if (spellId == "spare_the_dying") 0
    else if (spellId == "speak_with_animals") 1
    else if (spellId == "speak_with_dead") 3
    else if (spellId == "speak_with_plants") 3
    else if (spellId == "spider_climb") 2
    else if (spellId == "spike_growth") 2
    else if (spellId == "spirit_guardians") 3
    else if (spellId == "spiritual_weapon") 2
    else if (spellId == "starry_wisp") 0
    else if (spellId == "stinking_cloud") 3
    else if (spellId == "stone_shape") 4
    else if (spellId == "stoneskin") 4
    else if (spellId == "storm_of_vengeance") 9
    else if (spellId == "suggestion") 2
    else if (spellId == "summon_dragon") 5
    else if (spellId == "sunbeam") 6
    else if (spellId == "sunburst") 8
    else if (spellId == "symbol") 7
    else if (spellId == "telekinesis") 5
    else if (spellId == "telepathic_bond") 5
    else if (spellId == "teleport") 7
    else if (spellId == "teleportation_circle") 5
    else if (spellId == "thaumaturgy") 0
    else if (spellId == "thunderwave") 1
    else if (spellId == "time_stop") 9
    else if (spellId == "tiny_hut") 3
    else if (spellId == "tongues") 3
    else if (spellId == "transport_via_plants") 6
    else if (spellId == "tree_stride") 5
    else if (spellId == "true_polymorph") 9
    else if (spellId == "true_resurrection") 9
    else if (spellId == "true_seeing") 6
    else if (spellId == "true_strike") 0
    else if (spellId == "tsunami") 8
    else if (spellId == "unseen_servant") 1
    else if (spellId == "vampiric_touch") 3
    else if (spellId == "vicious_mockery") 0
    else if (spellId == "vitriolic_sphere") 4
    else if (spellId == "wall_of_fire") 4
    else if (spellId == "wall_of_force") 5
    else if (spellId == "wall_of_ice") 6
    else if (spellId == "wall_of_stone") 5
    else if (spellId == "wall_of_thorns") 6
    else if (spellId == "warding_bond") 2
    else if (spellId == "water_breathing") 3
    else if (spellId == "water_walk") 3
    else if (spellId == "web") 2
    else if (spellId == "weird") 9
    else if (spellId == "wind_walk") 6
    else if (spellId == "wind_wall") 3
    else if (spellId == "wish") 9
    else if (spellId == "word_of_recall") 6
    else if (spellId == "zone_of_truth") 2
    else 99

  pure def pSpellIsCantrip(spellId: str): bool =
    pSpellExists(spellId) and pSpellLevel(spellId) == 0

  pure def pSpellAvailableForClass(spellId: str, className: ClassName): bool =
    if (spellId == "acid_arrow") className == Wizard
    else if (spellId == "acid_splash") className == Sorcerer or className == Wizard
    else if (spellId == "aid") className == Bard or className == Cleric or className == Druid or className == Paladin or className == Ranger
    else if (spellId == "alarm") className == Ranger or className == Wizard
    else if (spellId == "alter_self") className == Sorcerer or className == Wizard
    else if (spellId == "animal_friendship") className == Bard or className == Druid or className == Ranger
    else if (spellId == "animal_messenger") className == Bard or className == Druid or className == Ranger
    else if (spellId == "animal_shapes") className == Druid
    else if (spellId == "animate_dead") className == Cleric or className == Wizard
    else if (spellId == "animate_objects") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "antilife_shell") className == Druid
    else if (spellId == "antimagic_field") className == Cleric or className == Wizard
    else if (spellId == "antipathy_sympathy") className == Bard or className == Druid or className == Wizard
    else if (spellId == "arcane_eye") className == Wizard
    else if (spellId == "arcane_hand") className == Sorcerer or className == Wizard
    else if (spellId == "arcane_lock") className == Wizard
    else if (spellId == "arcane_sword") className == Bard or className == Wizard
    else if (spellId == "arcanists_magic_aura") className == Wizard
    else if (spellId == "astral_projection") className == Cleric or className == Warlock or className == Wizard
    else if (spellId == "augury") className == Cleric or className == Druid or className == Wizard
    else if (spellId == "aura_of_life") className == Cleric or className == Paladin
    else if (spellId == "awaken") className == Bard or className == Druid
    else if (spellId == "bane") className == Bard or className == Cleric or className == Warlock
    else if (spellId == "banishment") className == Cleric or className == Paladin or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "barkskin") className == Druid or className == Ranger
    else if (spellId == "beacon_of_hope") className == Cleric
    else if (spellId == "befuddlement") className == Bard or className == Druid or className == Warlock or className == Wizard
    else if (spellId == "bestow_curse") className == Bard or className == Cleric or className == Wizard
    else if (spellId == "black_tentacles") className == Wizard
    else if (spellId == "blade_barrier") className == Cleric
    else if (spellId == "bless") className == Cleric or className == Paladin
    else if (spellId == "blight") className == Druid or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "blindness_deafness") className == Bard or className == Cleric or className == Sorcerer or className == Wizard
    else if (spellId == "blink") className == Sorcerer or className == Wizard
    else if (spellId == "blur") className == Sorcerer or className == Wizard
    else if (spellId == "burning_hands") className == Sorcerer or className == Wizard
    else if (spellId == "call_lightning") className == Druid
    else if (spellId == "calm_emotions") className == Bard or className == Cleric
    else if (spellId == "chain_lightning") className == Sorcerer or className == Wizard
    else if (spellId == "charm_monster") className == Bard or className == Druid or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "charm_person") className == Bard or className == Druid or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "chill_touch") className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "chromatic_orb") className == Sorcerer or className == Wizard
    else if (spellId == "circle_of_death") className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "clairvoyance") className == Bard or className == Cleric or className == Sorcerer or className == Wizard
    else if (spellId == "clone") className == Wizard
    else if (spellId == "cloudkill") className == Sorcerer or className == Wizard
    else if (spellId == "color_spray") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "command") className == Bard or className == Cleric or className == Paladin
    else if (spellId == "commune") className == Cleric
    else if (spellId == "commune_with_nature") className == Druid or className == Ranger
    else if (spellId == "comprehend_languages") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "compulsion") className == Bard
    else if (spellId == "cone_of_cold") className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "confusion") className == Bard or className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "conjure_animals") className == Druid or className == Ranger
    else if (spellId == "conjure_celestial") className == Cleric
    else if (spellId == "conjure_elemental") className == Druid or className == Wizard
    else if (spellId == "conjure_fey") className == Druid
    else if (spellId == "conjure_minor_elementals") className == Druid or className == Wizard
    else if (spellId == "conjure_woodland_beings") className == Druid or className == Ranger
    else if (spellId == "contact_other_plane") className == Warlock or className == Wizard
    else if (spellId == "contagion") className == Cleric or className == Druid
    else if (spellId == "contingency") className == Wizard
    else if (spellId == "continual_flame") className == Cleric or className == Druid or className == Wizard
    else if (spellId == "control_water") className == Cleric or className == Druid or className == Wizard
    else if (spellId == "control_weather") className == Cleric or className == Druid or className == Wizard
    else if (spellId == "counterspell") className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "create_food_and_water") className == Cleric or className == Paladin
    else if (spellId == "create_or_destroy_water") className == Cleric or className == Druid
    else if (spellId == "create_undead") className == Cleric or className == Warlock or className == Wizard
    else if (spellId == "creation") className == Sorcerer or className == Wizard
    else if (spellId == "cure_wounds") className == Bard or className == Cleric or className == Druid or className == Paladin or className == Ranger
    else if (spellId == "dancing_lights") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "darkness") className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "darkvision") className == Druid or className == Ranger or className == Sorcerer or className == Wizard
    else if (spellId == "daylight") className == Cleric or className == Druid or className == Paladin or className == Ranger or className == Sorcerer
    else if (spellId == "death_ward") className == Cleric or className == Paladin
    else if (spellId == "delayed_blast_fireball") className == Sorcerer or className == Wizard
    else if (spellId == "demiplane") className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "detect_evil_and_good") className == Cleric or className == Paladin
    else if (spellId == "detect_magic") className == Bard or className == Cleric or className == Druid or className == Paladin or className == Ranger or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "detect_poison_and_disease") className == Cleric or className == Druid or className == Paladin or className == Ranger
    else if (spellId == "detect_thoughts") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "dimension_door") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "disguise_self") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "disintegrate") className == Sorcerer or className == Wizard
    else if (spellId == "dispel_evil_and_good") className == Cleric or className == Paladin
    else if (spellId == "dispel_magic") className == Bard or className == Cleric or className == Druid or className == Paladin or className == Ranger or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "dissonant_whispers") className == Bard
    else if (spellId == "divination") className == Cleric or className == Druid or className == Wizard
    else if (spellId == "divine_favor") className == Paladin
    else if (spellId == "divine_smite") className == Paladin
    else if (spellId == "divine_word") className == Cleric
    else if (spellId == "dominate_beast") className == Druid or className == Ranger or className == Sorcerer
    else if (spellId == "dominate_monster") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "dominate_person") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "dragons_breath") className == Sorcerer or className == Wizard
    else if (spellId == "dream") className == Bard or className == Warlock or className == Wizard
    else if (spellId == "druidcraft") className == Druid
    else if (spellId == "earthquake") className == Cleric or className == Druid or className == Sorcerer
    else if (spellId == "eldritch_blast") className == Warlock
    else if (spellId == "elementalism") className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "enhance_ability") className == Bard or className == Cleric or className == Druid or className == Ranger or className == Sorcerer or className == Wizard
    else if (spellId == "enlarge_reduce") className == Bard or className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "ensnaring_strike") className == Ranger
    else if (spellId == "entangle") className == Druid or className == Ranger
    else if (spellId == "enthrall") className == Bard or className == Warlock
    else if (spellId == "etherealness") className == Bard or className == Cleric or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "expeditious_retreat") className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "eyebite") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "fabricate") className == Wizard
    else if (spellId == "faerie_fire") className == Bard or className == Druid
    else if (spellId == "faithful_hound") className == Wizard
    else if (spellId == "false_life") className == Sorcerer or className == Wizard
    else if (spellId == "fear") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "feather_fall") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "find_familiar") className == Wizard
    else if (spellId == "find_steed") className == Paladin
    else if (spellId == "find_the_path") className == Bard or className == Cleric or className == Druid
    else if (spellId == "find_traps") className == Cleric or className == Druid or className == Ranger
    else if (spellId == "finger_of_death") className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "fire_bolt") className == Sorcerer or className == Wizard
    else if (spellId == "fire_shield") className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "fire_storm") className == Cleric or className == Druid or className == Sorcerer
    else if (spellId == "fireball") className == Sorcerer or className == Wizard
    else if (spellId == "flame_blade") className == Druid or className == Sorcerer
    else if (spellId == "flame_strike") className == Cleric
    else if (spellId == "flaming_sphere") className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "flesh_to_stone") className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "floating_disk") className == Wizard
    else if (spellId == "fly") className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "fog_cloud") className == Druid or className == Ranger or className == Sorcerer or className == Wizard
    else if (spellId == "forbiddance") className == Cleric
    else if (spellId == "forcecage") className == Bard or className == Warlock or className == Wizard
    else if (spellId == "foresight") className == Bard or className == Druid or className == Warlock or className == Wizard
    else if (spellId == "freedom_of_movement") className == Bard or className == Cleric or className == Druid or className == Ranger
    else if (spellId == "freezing_sphere") className == Sorcerer or className == Wizard
    else if (spellId == "gaseous_form") className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "gate") className == Cleric or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "geas") className == Bard or className == Cleric or className == Druid or className == Paladin or className == Wizard
    else if (spellId == "gentle_repose") className == Cleric or className == Paladin or className == Wizard
    else if (spellId == "giant_insect") className == Druid
    else if (spellId == "glibness") className == Bard or className == Warlock
    else if (spellId == "globe_of_invulnerability") className == Sorcerer or className == Wizard
    else if (spellId == "glyph_of_warding") className == Bard or className == Cleric or className == Wizard
    else if (spellId == "goodberry") className == Druid or className == Ranger
    else if (spellId == "grease") className == Sorcerer or className == Wizard
    else if (spellId == "greater_invisibility") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "greater_restoration") className == Bard or className == Cleric or className == Druid or className == Paladin or className == Ranger
    else if (spellId == "guardian_of_faith") className == Cleric
    else if (spellId == "guards_and_wards") className == Bard or className == Wizard
    else if (spellId == "guidance") className == Cleric or className == Druid
    else if (spellId == "guiding_bolt") className == Cleric
    else if (spellId == "gust_of_wind") className == Druid or className == Ranger or className == Sorcerer or className == Wizard
    else if (spellId == "hallow") className == Cleric
    else if (spellId == "hallucinatory_terrain") className == Bard or className == Druid or className == Warlock or className == Wizard
    else if (spellId == "harm") className == Cleric
    else if (spellId == "haste") className == Sorcerer or className == Wizard
    else if (spellId == "heal") className == Cleric or className == Druid
    else if (spellId == "healing_word") className == Bard or className == Cleric or className == Druid
    else if (spellId == "heat_metal") className == Bard or className == Druid
    else if (spellId == "hellish_rebuke") className == Warlock
    else if (spellId == "heroes_feast") className == Bard or className == Cleric or className == Druid
    else if (spellId == "heroism") className == Bard or className == Paladin
    else if (spellId == "hex") className == Warlock
    else if (spellId == "hideous_laughter") className == Bard or className == Warlock or className == Wizard
    else if (spellId == "hold_monster") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "hold_person") className == Bard or className == Cleric or className == Druid or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "holy_aura") className == Cleric
    else if (spellId == "hunters_mark") className == Ranger
    else if (spellId == "hypnotic_pattern") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "ice_knife") className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "ice_storm") className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "identify") className == Bard or className == Wizard
    else if (spellId == "illusory_script") className == Bard or className == Warlock or className == Wizard
    else if (spellId == "imprisonment") className == Warlock or className == Wizard
    else if (spellId == "incendiary_cloud") className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "inflict_wounds") className == Cleric
    else if (spellId == "insect_plague") className == Cleric or className == Druid or className == Sorcerer
    else if (spellId == "instant_summons") className == Wizard
    else if (spellId == "invisibility") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "irresistible_dance") className == Bard or className == Wizard
    else if (spellId == "jump") className == Druid or className == Ranger or className == Sorcerer or className == Wizard
    else if (spellId == "knock") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "legend_lore") className == Bard or className == Cleric or className == Wizard
    else if (spellId == "lesser_restoration") className == Bard or className == Cleric or className == Druid or className == Paladin or className == Ranger
    else if (spellId == "levitate") className == Sorcerer or className == Wizard
    else if (spellId == "light") className == Bard or className == Cleric or className == Sorcerer or className == Wizard
    else if (spellId == "lightning_bolt") className == Sorcerer or className == Wizard
    else if (spellId == "locate_animals_or_plants") className == Bard or className == Druid or className == Ranger
    else if (spellId == "locate_creature") className == Bard or className == Cleric or className == Druid or className == Paladin or className == Ranger or className == Wizard
    else if (spellId == "locate_object") className == Bard or className == Cleric or className == Druid or className == Paladin or className == Ranger or className == Wizard
    else if (spellId == "longstrider") className == Bard or className == Druid or className == Ranger or className == Wizard
    else if (spellId == "mage_armor") className == Sorcerer or className == Wizard
    else if (spellId == "mage_hand") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "magic_circle") className == Cleric or className == Paladin or className == Warlock or className == Wizard
    else if (spellId == "magic_jar") className == Wizard
    else if (spellId == "magic_missile") className == Sorcerer or className == Wizard
    else if (spellId == "magic_mouth") className == Bard or className == Wizard
    else if (spellId == "magic_weapon") className == Paladin or className == Ranger or className == Sorcerer or className == Wizard
    else if (spellId == "magnificent_mansion") className == Bard or className == Wizard
    else if (spellId == "major_image") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "mass_cure_wounds") className == Bard or className == Cleric or className == Druid
    else if (spellId == "mass_heal") className == Cleric
    else if (spellId == "mass_healing_word") className == Bard or className == Cleric
    else if (spellId == "mass_suggestion") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "maze") className == Wizard
    else if (spellId == "meld_into_stone") className == Cleric or className == Druid or className == Ranger
    else if (spellId == "mending") className == Bard or className == Cleric or className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "message") className == Bard or className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "meteor_swarm") className == Sorcerer or className == Wizard
    else if (spellId == "mind_blank") className == Bard or className == Wizard
    else if (spellId == "mind_spike") className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "minor_illusion") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "mirage_arcane") className == Bard or className == Druid or className == Wizard
    else if (spellId == "mirror_image") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "mislead") className == Bard or className == Warlock or className == Wizard
    else if (spellId == "misty_step") className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "modify_memory") className == Bard or className == Wizard
    else if (spellId == "moonbeam") className == Druid
    else if (spellId == "move_earth") className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "nondetection") className == Bard or className == Ranger or className == Wizard
    else if (spellId == "pass_without_trace") className == Druid or className == Ranger
    else if (spellId == "passwall") className == Wizard
    else if (spellId == "phantasmal_force") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "phantasmal_killer") className == Bard or className == Wizard
    else if (spellId == "phantom_steed") className == Wizard
    else if (spellId == "planar_ally") className == Cleric
    else if (spellId == "planar_binding") className == Bard or className == Cleric or className == Druid or className == Warlock or className == Wizard
    else if (spellId == "plane_shift") className == Cleric or className == Druid or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "plant_growth") className == Bard or className == Druid or className == Ranger
    else if (spellId == "poison_spray") className == Druid or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "polymorph") className == Bard or className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "power_word_heal") className == Bard or className == Cleric
    else if (spellId == "power_word_kill") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "power_word_stun") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "prayer_of_healing") className == Cleric or className == Paladin
    else if (spellId == "prestidigitation") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "prismatic_spray") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "prismatic_wall") className == Bard or className == Wizard
    else if (spellId == "private_sanctum") className == Wizard
    else if (spellId == "produce_flame") className == Druid
    else if (spellId == "programmed_illusion") className == Bard or className == Wizard
    else if (spellId == "project_image") className == Bard or className == Wizard
    else if (spellId == "protection_from_energy") className == Cleric or className == Druid or className == Ranger or className == Sorcerer or className == Wizard
    else if (spellId == "protection_from_evil_and_good") className == Cleric or className == Druid or className == Paladin or className == Warlock or className == Wizard
    else if (spellId == "protection_from_poison") className == Cleric or className == Druid or className == Paladin or className == Ranger
    else if (spellId == "purify_food_and_drink") className == Cleric or className == Druid or className == Paladin
    else if (spellId == "raise_dead") className == Bard or className == Cleric or className == Paladin
    else if (spellId == "ray_of_enfeeblement") className == Warlock or className == Wizard
    else if (spellId == "ray_of_frost") className == Sorcerer or className == Wizard
    else if (spellId == "ray_of_sickness") className == Sorcerer or className == Wizard
    else if (spellId == "regenerate") className == Bard or className == Cleric or className == Druid
    else if (spellId == "reincarnate") className == Druid
    else if (spellId == "remove_curse") className == Cleric or className == Paladin or className == Warlock or className == Wizard
    else if (spellId == "resilient_sphere") className == Wizard
    else if (spellId == "resistance") className == Cleric or className == Druid
    else if (spellId == "resurrection") className == Bard or className == Cleric
    else if (spellId == "reverse_gravity") className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "revivify") className == Cleric or className == Druid or className == Paladin or className == Ranger
    else if (spellId == "rope_trick") className == Wizard
    else if (spellId == "sacred_flame") className == Cleric
    else if (spellId == "sanctuary") className == Cleric
    else if (spellId == "scorching_ray") className == Sorcerer or className == Wizard
    else if (spellId == "scrying") className == Bard or className == Cleric or className == Druid or className == Warlock or className == Wizard
    else if (spellId == "searing_smite") className == Paladin
    else if (spellId == "secret_chest") className == Wizard
    else if (spellId == "see_invisibility") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "seeming") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "sending") className == Bard or className == Cleric or className == Wizard
    else if (spellId == "sequester") className == Wizard
    else if (spellId == "shapechange") className == Druid or className == Wizard
    else if (spellId == "shatter") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "shield") className == Sorcerer or className == Wizard
    else if (spellId == "shield_of_faith") className == Cleric or className == Paladin
    else if (spellId == "shillelagh") className == Druid
    else if (spellId == "shining_smite") className == Paladin
    else if (spellId == "shocking_grasp") className == Sorcerer or className == Wizard
    else if (spellId == "silence") className == Bard or className == Cleric or className == Ranger
    else if (spellId == "silent_image") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "simulacrum") className == Wizard
    else if (spellId == "sleep") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "sleet_storm") className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "slow") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "sorcerous_burst") className == Sorcerer
    else if (spellId == "spare_the_dying") className == Cleric or className == Druid
    else if (spellId == "speak_with_animals") className == Bard or className == Druid or className == Ranger or className == Warlock
    else if (spellId == "speak_with_dead") className == Bard or className == Cleric or className == Wizard
    else if (spellId == "speak_with_plants") className == Bard or className == Druid or className == Ranger
    else if (spellId == "spider_climb") className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "spike_growth") className == Druid or className == Ranger
    else if (spellId == "spirit_guardians") className == Cleric
    else if (spellId == "spiritual_weapon") className == Cleric
    else if (spellId == "starry_wisp") className == Bard or className == Druid
    else if (spellId == "stinking_cloud") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "stone_shape") className == Cleric or className == Druid or className == Wizard
    else if (spellId == "stoneskin") className == Druid or className == Ranger or className == Sorcerer or className == Wizard
    else if (spellId == "storm_of_vengeance") className == Druid
    else if (spellId == "suggestion") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "summon_dragon") className == Wizard
    else if (spellId == "sunbeam") className == Cleric or className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "sunburst") className == Cleric or className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "symbol") className == Bard or className == Cleric or className == Druid or className == Wizard
    else if (spellId == "telekinesis") className == Sorcerer or className == Wizard
    else if (spellId == "telepathic_bond") className == Bard or className == Wizard
    else if (spellId == "teleport") className == Bard or className == Sorcerer or className == Wizard
    else if (spellId == "teleportation_circle") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "thaumaturgy") className == Cleric
    else if (spellId == "thunderwave") className == Bard or className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "time_stop") className == Sorcerer or className == Wizard
    else if (spellId == "tiny_hut") className == Bard or className == Wizard
    else if (spellId == "tongues") className == Bard or className == Cleric or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "transport_via_plants") className == Druid
    else if (spellId == "tree_stride") className == Druid or className == Ranger
    else if (spellId == "true_polymorph") className == Bard or className == Warlock or className == Wizard
    else if (spellId == "true_resurrection") className == Cleric or className == Druid
    else if (spellId == "true_seeing") className == Bard or className == Cleric or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "true_strike") className == Bard or className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "tsunami") className == Druid
    else if (spellId == "unseen_servant") className == Bard or className == Warlock or className == Wizard
    else if (spellId == "vampiric_touch") className == Sorcerer or className == Warlock or className == Wizard
    else if (spellId == "vicious_mockery") className == Bard
    else if (spellId == "vitriolic_sphere") className == Sorcerer or className == Wizard
    else if (spellId == "wall_of_fire") className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "wall_of_force") className == Wizard
    else if (spellId == "wall_of_ice") className == Wizard
    else if (spellId == "wall_of_stone") className == Druid or className == Sorcerer or className == Wizard
    else if (spellId == "wall_of_thorns") className == Druid
    else if (spellId == "warding_bond") className == Cleric or className == Paladin
    else if (spellId == "water_breathing") className == Druid or className == Ranger or className == Sorcerer or className == Wizard
    else if (spellId == "water_walk") className == Cleric or className == Druid or className == Ranger or className == Sorcerer
    else if (spellId == "web") className == Sorcerer or className == Wizard
    else if (spellId == "weird") className == Warlock or className == Wizard
    else if (spellId == "wind_walk") className == Druid
    else if (spellId == "wind_wall") className == Druid or className == Ranger
    else if (spellId == "wish") className == Sorcerer or className == Wizard
    else if (spellId == "word_of_recall") className == Cleric
    else if (spellId == "zone_of_truth") className == Bard or className == Cleric or className == Paladin
    else false
}
