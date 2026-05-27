//! Character creation module for the cleanroom experiment.
//!
//! Implemented from:
//! - `input/packages/character-creation-runtime/character-creation-runtime-slice.qnt`
//! - `input/.references/srd-5.2.1/Character-Creation.md`
//! - `input/.references/srd-5.2.1/Character-Origins.md`
//! - `input/.references/srd-5.2.1/Classes/Fighter.md`
//! - `input/.references/srd-5.2.1/Classes/Warlock.md`
//! - `input/.references/srd-5.2.1/Classes/Wizard.md`
//! - `input/.references/srd-5.2.1/Equipment.md`
//! - `input/.references/srd-5.2.1/Rules-Glossary.md`
//! - `input/.references/srd-5.2.1/Spells/Gaining-and-Casting.md`
//! - `input/packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt`

use std::collections::BTreeSet;

use crate::types::AbilityScores;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum CharacterLevelScope {
    Level1,
    Level2,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CharacterBuild {
    Fighter(FighterCharacterBuild),
    Wizard(WizardCharacterBuild),
}

impl CharacterBuild {
    pub fn level_scope(&self) -> CharacterLevelScope {
        match self {
            Self::Fighter(build) => build.level_scope,
            Self::Wizard(build) => build.level_scope,
        }
    }

    pub fn ability_scores(&self) -> AbilityScores {
        match self {
            Self::Fighter(build) => build.ability_scores,
            Self::Wizard(build) => build.ability_scores,
        }
    }

    pub fn fighter_weapon_mastery(&self) -> Option<&FighterWeaponMasteryBuildFeature> {
        match self {
            Self::Fighter(build) => Some(&build.weapon_mastery),
            Self::Wizard(_) => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FighterCharacterBuild {
    pub level_scope: CharacterLevelScope,
    pub ability_scores: AbilityScores,
    pub weapon_mastery: FighterWeaponMasteryBuildFeature,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WizardCharacterBuild {
    pub level_scope: CharacterLevelScope,
    pub ability_scores: AbilityScores,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum ClassUnitRef {
    Fighter,
}

impl ClassUnitRef {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Fighter => "class_fighter",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum ClassFeatureUnitRef {
    FighterWeaponMastery,
}

impl ClassFeatureUnitRef {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::FighterWeaponMastery => "fighter_weapon_mastery",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum WeaponUnitRef {
    Longsword,
    Spear,
    Flail,
}

impl WeaponUnitRef {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Longsword => "weapon_longsword",
            Self::Spear => "weapon_spear",
            Self::Flail => "weapon_flail",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FighterWeaponMasteryBuildFeature {
    pub feature_unit: ClassFeatureUnitRef,
    pub class_unit: ClassUnitRef,
    pub selected_weapons: [WeaponUnitRef; FIGHTER_WEAPON_MASTERY_CHOICE_COUNT],
}

const FIGHTER_WEAPON_MASTERY_CHOICE_COUNT: usize = 3;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum AbilityCheckSkill {
    Performance,
}

impl AbilityCheckSkill {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Performance => "performance",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AbilityCheckSkillTraining {
    LacksSkillProficiency {
        jack_of_all_trades_bard_level: Option<u8>,
        other_proficiency_bonus_applies: bool,
    },
    SkillProficiency,
    Expertise,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AbilityCheckProficiencyBonusInput {
    pub skill: AbilityCheckSkill,
    pub proficiency_bonus: i16,
    pub training: AbilityCheckSkillTraining,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AbilityCheckProficiencyBonusTag {
    None,
    JackOfAllTrades,
    SkillProficiency,
    Expertise,
}

impl AbilityCheckProficiencyBonusTag {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::None => "none",
            Self::JackOfAllTrades => "jackOfAllTrades",
            Self::SkillProficiency => "skillProficiency",
            Self::Expertise => "expertise",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AbilityCheckProficiencyBonusSourceUnit {
    BardJackOfAllTrades,
}

impl AbilityCheckProficiencyBonusSourceUnit {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::BardJackOfAllTrades => "bard_jack_of_all_trades",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct AbilityCheckProficiencyBonusProjection {
    pub tag: AbilityCheckProficiencyBonusTag,
    pub source_unit: Option<AbilityCheckProficiencyBonusSourceUnit>,
    pub skill: AbilityCheckSkill,
    pub bonus: i16,
}

pub fn project_ability_check_proficiency_bonus(
    input: AbilityCheckProficiencyBonusInput,
) -> AbilityCheckProficiencyBonusProjection {
    match input.training {
        AbilityCheckSkillTraining::Expertise => ability_check_proficiency_bonus_projection(
            AbilityCheckProficiencyBonusTag::Expertise,
            None,
            input.skill,
            input.proficiency_bonus * 2,
        ),
        AbilityCheckSkillTraining::SkillProficiency => ability_check_proficiency_bonus_projection(
            AbilityCheckProficiencyBonusTag::SkillProficiency,
            None,
            input.skill,
            input.proficiency_bonus,
        ),
        AbilityCheckSkillTraining::LacksSkillProficiency {
            jack_of_all_trades_bard_level: Some(2..),
            other_proficiency_bonus_applies: false,
        } => ability_check_proficiency_bonus_projection(
            AbilityCheckProficiencyBonusTag::JackOfAllTrades,
            Some(AbilityCheckProficiencyBonusSourceUnit::BardJackOfAllTrades),
            input.skill,
            input.proficiency_bonus / 2,
        ),
        AbilityCheckSkillTraining::LacksSkillProficiency { .. } => {
            ability_check_proficiency_bonus_projection(
                AbilityCheckProficiencyBonusTag::None,
                None,
                input.skill,
                0,
            )
        }
    }
}

fn ability_check_proficiency_bonus_projection(
    tag: AbilityCheckProficiencyBonusTag,
    source_unit: Option<AbilityCheckProficiencyBonusSourceUnit>,
    skill: AbilityCheckSkill,
    bonus: i16,
) -> AbilityCheckProficiencyBonusProjection {
    AbilityCheckProficiencyBonusProjection {
        tag,
        source_unit,
        skill,
        bonus,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ArmorClassBaseSource {
    DefaultUnarmored,
    UnarmoredDefense,
}

impl ArmorClassBaseSource {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::DefaultUnarmored => "default_unarmored",
            Self::UnarmoredDefense => "unarmored_defense",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ArmorClassSourceUnit {
    BarbarianUnarmoredDefense,
    MonkUnarmoredDefense,
}

impl ArmorClassSourceUnit {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::BarbarianUnarmoredDefense => "barbarian_unarmored_defense",
            Self::MonkUnarmoredDefense => "monk_unarmored_defense",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ArmorClassFormulaInput {
    DefaultUnarmored {
        dexterity_modifier: i16,
        shield_bonus: i16,
    },
    BarbarianUnarmoredDefense {
        dexterity_modifier: i16,
        constitution_modifier: i16,
        shield_bonus: i16,
    },
    MonkUnarmoredDefense {
        dexterity_modifier: i16,
        wisdom_modifier: i16,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ArmorClassBaseFormulaProjection {
    pub source_unit: Option<ArmorClassSourceUnit>,
    pub base_source: ArmorClassBaseSource,
    pub base_armor_class: i16,
    pub uses_dexterity: bool,
    pub uses_constitution: bool,
    pub uses_wisdom: bool,
    pub shield_bonus: i16,
    pub armor_class: i16,
}

pub fn project_armor_class_base_formula(
    input: ArmorClassFormulaInput,
) -> ArmorClassBaseFormulaProjection {
    let base_armor_class = 10;
    match input {
        ArmorClassFormulaInput::DefaultUnarmored {
            dexterity_modifier,
            shield_bonus,
        } => ArmorClassBaseFormulaProjection {
            source_unit: None,
            base_source: ArmorClassBaseSource::DefaultUnarmored,
            base_armor_class,
            uses_dexterity: true,
            uses_constitution: false,
            uses_wisdom: false,
            shield_bonus,
            armor_class: base_armor_class + dexterity_modifier + shield_bonus,
        },
        ArmorClassFormulaInput::BarbarianUnarmoredDefense {
            dexterity_modifier,
            constitution_modifier,
            shield_bonus,
        } => ArmorClassBaseFormulaProjection {
            source_unit: Some(ArmorClassSourceUnit::BarbarianUnarmoredDefense),
            base_source: ArmorClassBaseSource::UnarmoredDefense,
            base_armor_class,
            uses_dexterity: true,
            uses_constitution: true,
            uses_wisdom: false,
            shield_bonus,
            armor_class: base_armor_class
                + dexterity_modifier
                + constitution_modifier
                + shield_bonus,
        },
        ArmorClassFormulaInput::MonkUnarmoredDefense {
            dexterity_modifier,
            wisdom_modifier,
        } => ArmorClassBaseFormulaProjection {
            source_unit: Some(ArmorClassSourceUnit::MonkUnarmoredDefense),
            base_source: ArmorClassBaseSource::UnarmoredDefense,
            base_armor_class,
            uses_dexterity: true,
            uses_constitution: false,
            uses_wisdom: true,
            shield_bonus: 0,
            armor_class: base_armor_class + dexterity_modifier + wisdom_modifier,
        },
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct OrdinarySpellSlotFacts {
    pub level1_capacity: i16,
    pub level1_expended: i16,
    pub level2_capacity: i16,
    pub level2_expended: i16,
    pub created_level1_capacity: i16,
    pub created_level1_expended: i16,
}

impl OrdinarySpellSlotFacts {
    pub const fn none() -> Self {
        Self {
            level1_capacity: 0,
            level1_expended: 0,
            level2_capacity: 0,
            level2_expended: 0,
            created_level1_capacity: 0,
            created_level1_expended: 0,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PactSlotFacts {
    pub slot_level: i16,
    pub capacity: i16,
    pub expended: i16,
}

impl PactSlotFacts {
    pub const fn none() -> Self {
        Self {
            slot_level: 0,
            capacity: 0,
            expended: 0,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SheetSlotFacts {
    pub ordinary: OrdinarySpellSlotFacts,
    pub pact: PactSlotFacts,
    pub arcane_recovery_used_since_long_rest: bool,
    pub magical_cunning_used_since_long_rest: bool,
}

impl SheetSlotFacts {
    pub const fn empty() -> Self {
        Self {
            ordinary: OrdinarySpellSlotFacts::none(),
            pact: PactSlotFacts::none(),
            arcane_recovery_used_since_long_rest: false,
            magical_cunning_used_since_long_rest: false,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SheetSlotExpectedCapacities {
    pub ordinary_level1_capacity: i16,
    pub pact_slot_level: i16,
    pub pact_capacity: i16,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SheetSlotTransitionIssue {
    OrdinarySpellSlotCapacityMismatchForLevel1,
    PactSlotStateDoesNotMatchPactMagicBuildCapacity,
    MagicalCunningMustRecoverExpendedPactSlots,
    ArcaneRecoveryCannotRefundMoreSpellSlotsThanExpended,
}

impl SheetSlotTransitionIssue {
    pub fn message(self) -> &'static str {
        match self {
            Self::OrdinarySpellSlotCapacityMismatchForLevel1 => {
                "Spell Slot state does not match build capacity for level 1."
            }
            Self::PactSlotStateDoesNotMatchPactMagicBuildCapacity => {
                "Pact Slot state must match Pact Magic build capacity."
            }
            Self::MagicalCunningMustRecoverExpendedPactSlots => {
                "Magical Cunning must recover expended Pact Slots."
            }
            Self::ArcaneRecoveryCannotRefundMoreSpellSlotsThanExpended => {
                "Arcane Recovery cannot refund more Spell Slots than are expended."
            }
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SheetSlotTransitionResult {
    Accepted {
        sheet: SheetSlotFacts,
    },
    Rejected {
        sheet: SheetSlotFacts,
        issue: SheetSlotTransitionIssue,
    },
}

impl SheetSlotTransitionResult {
    pub fn accepted_sheet(self) -> Option<SheetSlotFacts> {
        match self {
            Self::Accepted { sheet } => Some(sheet),
            Self::Rejected { .. } => None,
        }
    }

    pub fn rejected_issue(self) -> Option<SheetSlotTransitionIssue> {
        match self {
            Self::Accepted { .. } => None,
            Self::Rejected { issue, .. } => Some(issue),
        }
    }
}

pub fn admit_sheet_slot_facts(
    sheet: SheetSlotFacts,
    expected: SheetSlotExpectedCapacities,
) -> SheetSlotTransitionResult {
    if sheet.ordinary.level1_capacity != expected.ordinary_level1_capacity {
        return reject_slot_transition(
            sheet,
            SheetSlotTransitionIssue::OrdinarySpellSlotCapacityMismatchForLevel1,
        );
    }

    if sheet.pact.slot_level != expected.pact_slot_level
        || sheet.pact.capacity != expected.pact_capacity
        || sheet.pact.expended > sheet.pact.capacity
    {
        return reject_slot_transition(
            sheet,
            SheetSlotTransitionIssue::PactSlotStateDoesNotMatchPactMagicBuildCapacity,
        );
    }

    accept_slot_transition(sheet)
}

pub fn recover_pact_slots(sheet: SheetSlotFacts) -> SheetSlotFacts {
    SheetSlotFacts {
        pact: PactSlotFacts {
            expended: 0,
            ..sheet.pact
        },
        ..sheet
    }
}

pub fn complete_long_rest_slot_benefits(sheet: SheetSlotFacts) -> SheetSlotFacts {
    SheetSlotFacts {
        ordinary: OrdinarySpellSlotFacts {
            level1_expended: 0,
            level2_expended: 0,
            created_level1_capacity: 0,
            created_level1_expended: 0,
            ..sheet.ordinary
        },
        pact: PactSlotFacts {
            expended: 0,
            ..sheet.pact
        },
        arcane_recovery_used_since_long_rest: false,
        magical_cunning_used_since_long_rest: false,
    }
}

pub fn complete_short_rest_slot_benefits(sheet: SheetSlotFacts) -> SheetSlotFacts {
    recover_pact_slots(sheet)
}

pub fn complete_short_rest_with_arcane_recovery_level2(
    sheet: SheetSlotFacts,
) -> SheetSlotTransitionResult {
    apply_arcane_recovery_level2(recover_pact_slots(sheet))
}

pub fn apply_arcane_recovery_level2(sheet: SheetSlotFacts) -> SheetSlotTransitionResult {
    if sheet.ordinary.level2_expended <= 0 {
        return reject_slot_transition(
            sheet,
            SheetSlotTransitionIssue::ArcaneRecoveryCannotRefundMoreSpellSlotsThanExpended,
        );
    }

    accept_slot_transition(SheetSlotFacts {
        ordinary: OrdinarySpellSlotFacts {
            level2_expended: sheet.ordinary.level2_expended - 1,
            ..sheet.ordinary
        },
        arcane_recovery_used_since_long_rest: true,
        ..sheet
    })
}

pub fn interrupted_short_rest_slot_benefits(sheet: SheetSlotFacts) -> SheetSlotFacts {
    sheet
}

pub fn interrupted_long_rest_slot_benefits(
    sheet: SheetSlotFacts,
    rested_at_least_one_hour: bool,
) -> SheetSlotFacts {
    if rested_at_least_one_hour {
        recover_pact_slots(sheet)
    } else {
        sheet
    }
}

pub fn apply_magical_cunning(sheet: SheetSlotFacts) -> SheetSlotTransitionResult {
    if sheet.pact.expended <= 0 {
        return reject_slot_transition(
            sheet,
            SheetSlotTransitionIssue::MagicalCunningMustRecoverExpendedPactSlots,
        );
    }

    let recovered = (sheet.pact.capacity + 1) / 2;
    accept_slot_transition(SheetSlotFacts {
        pact: PactSlotFacts {
            expended: (sheet.pact.expended - recovered).max(0),
            ..sheet.pact
        },
        magical_cunning_used_since_long_rest: true,
        ..sheet
    })
}

fn accept_slot_transition(sheet: SheetSlotFacts) -> SheetSlotTransitionResult {
    SheetSlotTransitionResult::Accepted { sheet }
}

fn reject_slot_transition(
    sheet: SheetSlotFacts,
    issue: SheetSlotTransitionIssue,
) -> SheetSlotTransitionResult {
    SheetSlotTransitionResult::Rejected { sheet, issue }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum HoleId {
    Progression,
    Background,
    Species,
    AbilityScores,
    Languages,
    Alignment,
    ClassSkills,
    FighterFightingStyle,
    FighterWeaponMastery,
    BackgroundAbilityScoreIncrease,
    BackgroundTool,
    ClassEquipment,
    BackgroundEquipment,
    EquipmentPurchase,
    LoadoutArmor,
    LoadoutShield,
    LoadoutWeapon,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HoleKind {
    Choice,
    AbilityScore,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum ChoiceOptionId {
    ClassFighterLevel1,
    ClassFighterLevel2,
    ClassWizardLevel1,
    BackgroundSoldier,
    SpeciesOrc,
    LanguageCommonSignLanguage,
    LanguageDraconic,
    LanguageDwarvish,
    LanguageElvish,
    LanguageGiant,
    LanguageGnomish,
    LanguageGoblin,
    LanguageHalfling,
    LanguageOrc,
    AlignmentLawfulGood,
    AlignmentNeutralGood,
    AlignmentChaoticGood,
    AlignmentLawfulNeutral,
    AlignmentNeutralNeutral,
    AlignmentChaoticNeutral,
    AlignmentLawfulEvil,
    AlignmentNeutralEvil,
    AlignmentChaoticEvil,
    SkillAcrobatics,
    SkillAnimalHandling,
    SkillAthletics,
    SkillHistory,
    SkillInsight,
    SkillIntimidation,
    SkillPersuasion,
    SkillPerception,
    SkillSurvival,
    FightingStyleDefense,
    WeaponLongsword,
    WeaponDagger,
    WeaponSpear,
    WeaponFlail,
    WeaponShortbow,
    BackgroundAsiStrDex,
    BackgroundAsiStrCon,
    BackgroundAsiDexStr,
    BackgroundAsiDexCon,
    BackgroundAsiConStr,
    BackgroundAsiConDex,
    BackgroundAsiOneEach,
    ToolDiceSet,
    ClassEquipmentPackageA,
    ClassEquipmentPackageB,
    ClassEquipmentCoins,
    BackgroundEquipmentPack,
    BackgroundEquipmentCoins,
    ArmorChainMail,
    EquipmentShield,
    LoadoutWorn,
    LoadoutWielded,
    LoadoutWieldedOneHanded,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SupportedAbilityScoreMethod {
    StandardArray,
    PointBuy,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum ProgressionSelection {
    None,
    FighterLevel1,
    FighterLevel2,
    WizardLevel1,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Fill {
    Choice {
        hole: HoleId,
        options: Vec<ChoiceOptionId>,
    },
    AbilityScores {
        hole: HoleId,
        method: SupportedAbilityScoreMethod,
        scores: AbilityScores,
    },
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum FillIssueCode {
    UnknownHole,
    DuplicateFill,
    WrongFillKind,
    InvalidChoice,
    InvalidAbilityScores,
    TooFewChoices,
    TooManyChoices,
    UnsupportedChoice,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum BatchIssueCode {
    StaleRevision,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct FillIssue {
    pub fill_index: usize,
    pub hole: HoleId,
    pub code: FillIssueCode,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreationIssues {
    pub batch: BTreeSet<BatchIssueCode>,
    pub fills: BTreeSet<FillIssue>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FinalizationStatus {
    Ready,
    Incomplete,
    Invalid,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum FillBatchResult {
    Accepted {
        draft: Draft,
        holes: BTreeSet<HoleId>,
        finalization: FinalizationStatus,
    },
    Rejected {
        draft: Draft,
        holes: BTreeSet<HoleId>,
        issues: CreationIssues,
        finalization: FinalizationStatus,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Draft {
    revision: u32,
    progression: ProgressionSelection,
    ability_scores: Option<AbilityScores>,
    background: bool,
    species: bool,
    languages: bool,
    alignment: bool,
    class_skills: bool,
    fighter_fighting_style: bool,
    fighter_weapon_mastery: Option<[WeaponUnitRef; FIGHTER_WEAPON_MASTERY_CHOICE_COUNT]>,
    background_ability_score_increase: bool,
    background_tool: bool,
    class_equipment: bool,
    background_equipment: bool,
    equipment_purchase: bool,
    loadout_armor: bool,
    loadout_shield: bool,
    loadout_weapon: bool,
}

impl Default for Draft {
    fn default() -> Self {
        Self {
            revision: 0,
            progression: ProgressionSelection::None,
            ability_scores: None,
            background: false,
            species: false,
            languages: false,
            alignment: false,
            class_skills: false,
            fighter_fighting_style: false,
            fighter_weapon_mastery: None,
            background_ability_score_increase: false,
            background_tool: false,
            class_equipment: false,
            background_equipment: false,
            equipment_purchase: false,
            loadout_armor: false,
            loadout_shield: false,
            loadout_weapon: false,
        }
    }
}

impl Draft {
    pub fn empty() -> Self {
        Self::default()
    }

    pub fn revision(&self) -> u32 {
        self.revision
    }

    pub fn progression(&self) -> ProgressionSelection {
        self.progression
    }

    pub fn ability_scores(&self) -> Option<AbilityScores> {
        self.ability_scores
    }

    pub fn open_holes(&self) -> BTreeSet<HoleId> {
        open_creation_holes(self)
    }

    pub fn finalization_status(&self) -> FinalizationStatus {
        finalize_draft(self)
    }

    pub fn finalize_build(&self) -> Result<CharacterBuild, FinalizationStatus> {
        if finalize_draft(self) != FinalizationStatus::Ready {
            return Err(finalize_draft(self));
        }

        let ability_scores = match self.ability_scores {
            Some(ability_scores) => ability_scores,
            None => return Err(FinalizationStatus::Invalid),
        };

        match self.progression {
            ProgressionSelection::FighterLevel1 => {
                let selected_weapons = match self.fighter_weapon_mastery {
                    Some(selected_weapons) => selected_weapons,
                    None => return Err(FinalizationStatus::Invalid),
                };

                Ok(finalize_fighter_build(
                    CharacterLevelScope::Level1,
                    ability_scores,
                    selected_weapons,
                ))
            }
            ProgressionSelection::FighterLevel2 => {
                let selected_weapons = match self.fighter_weapon_mastery {
                    Some(selected_weapons) => selected_weapons,
                    None => return Err(FinalizationStatus::Invalid),
                };

                Ok(finalize_fighter_build(
                    CharacterLevelScope::Level2,
                    ability_scores,
                    selected_weapons,
                ))
            }
            ProgressionSelection::WizardLevel1 => {
                Ok(CharacterBuild::Wizard(WizardCharacterBuild {
                    level_scope: CharacterLevelScope::Level1,
                    ability_scores,
                }))
            }
            ProgressionSelection::None => Err(FinalizationStatus::Invalid),
        }
    }
}

fn finalize_fighter_build(
    level_scope: CharacterLevelScope,
    ability_scores: AbilityScores,
    selected_weapons: [WeaponUnitRef; FIGHTER_WEAPON_MASTERY_CHOICE_COUNT],
) -> CharacterBuild {
    CharacterBuild::Fighter(FighterCharacterBuild {
        level_scope,
        ability_scores,
        weapon_mastery: FighterWeaponMasteryBuildFeature {
            feature_unit: ClassFeatureUnitRef::FighterWeaponMastery,
            class_unit: ClassUnitRef::Fighter,
            selected_weapons,
        },
    })
}

pub fn empty_draft() -> Draft {
    Draft::empty()
}

pub fn fill_creation_holes(
    draft: &Draft,
    expected_revision: u32,
    fills: &[Fill],
) -> FillBatchResult {
    let open = open_creation_holes(draft);
    let mut batch_issues = BTreeSet::new();
    if expected_revision != draft.revision {
        batch_issues.insert(BatchIssueCode::StaleRevision);
    }

    let fill_issues = fill_issues_for_batch(fills, &open);

    if !batch_issues.is_empty() || !fill_issues.is_empty() {
        FillBatchResult::Rejected {
            draft: draft.clone(),
            holes: open,
            issues: CreationIssues {
                batch: batch_issues,
                fills: fill_issues,
            },
            finalization: finalize_draft(draft),
        }
    } else {
        let next_draft = apply_accepted_batch(draft, fills);
        let holes = open_creation_holes(&next_draft);
        let finalization = finalize_draft(&next_draft);
        FillBatchResult::Accepted {
            draft: next_draft,
            holes,
            finalization,
        }
    }
}

pub fn fighter_standard_array() -> AbilityScores {
    AbilityScores {
        strength: 15,
        dexterity: 14,
        constitution: 13,
        intelligence: 8,
        wisdom: 10,
        charisma: 12,
    }
}

pub fn initial_manifest_fills() -> Vec<Fill> {
    vec![
        Fill::Choice {
            hole: HoleId::Progression,
            options: vec![ChoiceOptionId::ClassFighterLevel1],
        },
        Fill::Choice {
            hole: HoleId::Background,
            options: vec![ChoiceOptionId::BackgroundSoldier],
        },
        Fill::Choice {
            hole: HoleId::Species,
            options: vec![ChoiceOptionId::SpeciesOrc],
        },
        Fill::AbilityScores {
            hole: HoleId::AbilityScores,
            method: SupportedAbilityScoreMethod::StandardArray,
            scores: fighter_standard_array(),
        },
        Fill::Choice {
            hole: HoleId::Languages,
            options: vec![
                ChoiceOptionId::LanguageDwarvish,
                ChoiceOptionId::LanguageGoblin,
            ],
        },
        Fill::Choice {
            hole: HoleId::Alignment,
            options: vec![ChoiceOptionId::AlignmentLawfulGood],
        },
    ]
}

pub fn manifest_choice_fills() -> Vec<Fill> {
    vec![
        Fill::Choice {
            hole: HoleId::ClassSkills,
            options: vec![
                ChoiceOptionId::SkillPerception,
                ChoiceOptionId::SkillSurvival,
            ],
        },
        Fill::Choice {
            hole: HoleId::FighterFightingStyle,
            options: vec![ChoiceOptionId::FightingStyleDefense],
        },
        Fill::Choice {
            hole: HoleId::FighterWeaponMastery,
            options: vec![
                ChoiceOptionId::WeaponLongsword,
                ChoiceOptionId::WeaponSpear,
                ChoiceOptionId::WeaponFlail,
            ],
        },
        Fill::Choice {
            hole: HoleId::BackgroundAbilityScoreIncrease,
            options: vec![ChoiceOptionId::BackgroundAsiStrCon],
        },
        Fill::Choice {
            hole: HoleId::BackgroundTool,
            options: vec![ChoiceOptionId::ToolDiceSet],
        },
        Fill::Choice {
            hole: HoleId::ClassEquipment,
            options: vec![ChoiceOptionId::ClassEquipmentCoins],
        },
        Fill::Choice {
            hole: HoleId::BackgroundEquipment,
            options: vec![ChoiceOptionId::BackgroundEquipmentCoins],
        },
    ]
}

pub fn manifest_purchase_fills() -> Vec<Fill> {
    vec![Fill::Choice {
        hole: HoleId::EquipmentPurchase,
        options: vec![
            ChoiceOptionId::ArmorChainMail,
            ChoiceOptionId::WeaponLongsword,
            ChoiceOptionId::EquipmentShield,
        ],
    }]
}

pub fn manifest_loadout_fills() -> Vec<Fill> {
    vec![
        Fill::Choice {
            hole: HoleId::LoadoutArmor,
            options: vec![ChoiceOptionId::LoadoutWorn],
        },
        Fill::Choice {
            hole: HoleId::LoadoutShield,
            options: vec![ChoiceOptionId::LoadoutWielded],
        },
        Fill::Choice {
            hole: HoleId::LoadoutWeapon,
            options: vec![ChoiceOptionId::LoadoutWieldedOneHanded],
        },
    ]
}

fn has_progression(draft: &Draft) -> bool {
    draft.progression != ProgressionSelection::None
}

fn has_fighter_progression(draft: &Draft) -> bool {
    matches!(
        draft.progression,
        ProgressionSelection::FighterLevel1 | ProgressionSelection::FighterLevel2
    )
}

fn has_wizard_progression(draft: &Draft) -> bool {
    draft.progression == ProgressionSelection::WizardLevel1
}

fn open_creation_holes(draft: &Draft) -> BTreeSet<HoleId> {
    let mut holes = BTreeSet::new();

    insert_if(&mut holes, !has_progression(draft), HoleId::Progression);
    insert_if(&mut holes, !draft.background, HoleId::Background);
    insert_if(&mut holes, !draft.species, HoleId::Species);
    insert_if(
        &mut holes,
        draft.ability_scores.is_none(),
        HoleId::AbilityScores,
    );
    insert_if(&mut holes, !draft.languages, HoleId::Languages);
    insert_if(&mut holes, !draft.alignment, HoleId::Alignment);

    if has_fighter_progression(draft) {
        insert_if(&mut holes, !draft.class_skills, HoleId::ClassSkills);
        insert_if(
            &mut holes,
            !draft.fighter_fighting_style,
            HoleId::FighterFightingStyle,
        );
        insert_if(
            &mut holes,
            draft.fighter_weapon_mastery.is_none(),
            HoleId::FighterWeaponMastery,
        );
        insert_if(&mut holes, !draft.class_equipment, HoleId::ClassEquipment);
    } else if has_wizard_progression(draft) {
        insert_if(&mut holes, !draft.class_skills, HoleId::ClassSkills);
        insert_if(&mut holes, !draft.class_equipment, HoleId::ClassEquipment);
    }

    if draft.background {
        insert_if(
            &mut holes,
            !draft.background_ability_score_increase,
            HoleId::BackgroundAbilityScoreIncrease,
        );
        insert_if(&mut holes, !draft.background_tool, HoleId::BackgroundTool);
        insert_if(
            &mut holes,
            !draft.background_equipment,
            HoleId::BackgroundEquipment,
        );
    }

    if draft.class_equipment && draft.background_equipment {
        insert_if(
            &mut holes,
            !draft.equipment_purchase,
            HoleId::EquipmentPurchase,
        );
        insert_if(
            &mut holes,
            draft.equipment_purchase && !draft.loadout_armor,
            HoleId::LoadoutArmor,
        );
        insert_if(
            &mut holes,
            draft.equipment_purchase && !draft.loadout_shield,
            HoleId::LoadoutShield,
        );
        insert_if(
            &mut holes,
            draft.equipment_purchase && !draft.loadout_weapon,
            HoleId::LoadoutWeapon,
        );
    }

    holes
}

fn insert_if(set: &mut BTreeSet<HoleId>, condition: bool, hole: HoleId) {
    if condition {
        set.insert(hole);
    }
}

fn finalize_draft(draft: &Draft) -> FinalizationStatus {
    if !open_creation_holes(draft).is_empty() {
        return FinalizationStatus::Incomplete;
    }

    if has_progression(draft)
        && draft.background
        && draft.species
        && draft.ability_scores.is_some()
        && draft.languages
        && draft.alignment
        && ((has_fighter_progression(draft)
            && draft.class_skills
            && draft.fighter_fighting_style
            && draft.fighter_weapon_mastery.is_some())
            || (has_wizard_progression(draft) && draft.class_skills))
        && draft.background_ability_score_increase
        && draft.background_tool
        && draft.class_equipment
        && draft.background_equipment
        && draft.equipment_purchase
        && draft.loadout_armor
        && draft.loadout_shield
        && draft.loadout_weapon
    {
        FinalizationStatus::Ready
    } else {
        FinalizationStatus::Invalid
    }
}

fn hole_kind(hole: HoleId) -> HoleKind {
    match hole {
        HoleId::AbilityScores => HoleKind::AbilityScore,
        _ => HoleKind::Choice,
    }
}

fn fill_hole(fill: &Fill) -> HoleId {
    match fill {
        Fill::Choice { hole, .. } | Fill::AbilityScores { hole, .. } => *hole,
    }
}

fn fill_kind_matches_hole(fill: &Fill, hole: HoleId) -> bool {
    match fill {
        Fill::Choice { .. } => hole_kind(hole) == HoleKind::Choice,
        Fill::AbilityScores { .. } => hole_kind(hole) == HoleKind::AbilityScore,
    }
}

fn valid_options(hole: HoleId) -> BTreeSet<ChoiceOptionId> {
    use ChoiceOptionId::*;
    match hole {
        HoleId::Progression => set([ClassFighterLevel1, ClassFighterLevel2, ClassWizardLevel1]),
        HoleId::Background => set([BackgroundSoldier]),
        HoleId::Species => set([SpeciesOrc]),
        HoleId::Languages => set([
            LanguageCommonSignLanguage,
            LanguageDraconic,
            LanguageDwarvish,
            LanguageElvish,
            LanguageGiant,
            LanguageGnomish,
            LanguageGoblin,
            LanguageHalfling,
            LanguageOrc,
        ]),
        HoleId::Alignment => set([
            AlignmentLawfulGood,
            AlignmentNeutralGood,
            AlignmentChaoticGood,
            AlignmentLawfulNeutral,
            AlignmentNeutralNeutral,
            AlignmentChaoticNeutral,
            AlignmentLawfulEvil,
            AlignmentNeutralEvil,
            AlignmentChaoticEvil,
        ]),
        HoleId::ClassSkills => set([
            SkillAcrobatics,
            SkillAnimalHandling,
            SkillAthletics,
            SkillHistory,
            SkillInsight,
            SkillIntimidation,
            SkillPersuasion,
            SkillPerception,
            SkillSurvival,
        ]),
        HoleId::FighterFightingStyle => set([FightingStyleDefense]),
        HoleId::FighterWeaponMastery => {
            set([WeaponLongsword, WeaponSpear, WeaponFlail, WeaponShortbow])
        }
        HoleId::BackgroundAbilityScoreIncrease => set([
            BackgroundAsiStrDex,
            BackgroundAsiStrCon,
            BackgroundAsiDexStr,
            BackgroundAsiDexCon,
            BackgroundAsiConStr,
            BackgroundAsiConDex,
            BackgroundAsiOneEach,
        ]),
        HoleId::BackgroundTool => set([ToolDiceSet]),
        HoleId::ClassEquipment => set([
            ClassEquipmentPackageA,
            ClassEquipmentPackageB,
            ClassEquipmentCoins,
        ]),
        HoleId::BackgroundEquipment => set([BackgroundEquipmentPack, BackgroundEquipmentCoins]),
        HoleId::EquipmentPurchase => set([
            ArmorChainMail,
            WeaponLongsword,
            WeaponDagger,
            WeaponFlail,
            EquipmentShield,
        ]),
        HoleId::LoadoutArmor => set([LoadoutWorn]),
        HoleId::LoadoutShield => set([LoadoutWielded]),
        HoleId::LoadoutWeapon => set([LoadoutWieldedOneHanded]),
        HoleId::AbilityScores => BTreeSet::new(),
    }
}

fn supported_options(hole: HoleId) -> BTreeSet<ChoiceOptionId> {
    use ChoiceOptionId::*;
    match hole {
        HoleId::Progression => set([ClassFighterLevel1, ClassFighterLevel2, ClassWizardLevel1]),
        HoleId::Languages => set([LanguageDwarvish, LanguageGoblin]),
        HoleId::Alignment => set([AlignmentLawfulGood]),
        HoleId::ClassSkills => set([SkillPerception, SkillSurvival]),
        HoleId::FighterWeaponMastery => set([WeaponLongsword, WeaponSpear, WeaponFlail]),
        HoleId::BackgroundAbilityScoreIncrease => set([BackgroundAsiStrCon]),
        HoleId::ClassEquipment => set([ClassEquipmentCoins]),
        HoleId::BackgroundEquipment => set([BackgroundEquipmentCoins]),
        _ => valid_options(hole),
    }
}

fn set<const N: usize>(items: [ChoiceOptionId; N]) -> BTreeSet<ChoiceOptionId> {
    BTreeSet::from(items)
}

fn required_choice_count(hole: HoleId) -> usize {
    match hole {
        HoleId::Languages | HoleId::ClassSkills => 2,
        HoleId::FighterWeaponMastery | HoleId::EquipmentPurchase => 3,
        _ => 1,
    }
}

fn all_options_in(options: &[ChoiceOptionId], allowed: &BTreeSet<ChoiceOptionId>) -> bool {
    options.iter().all(|option| allowed.contains(option))
}

fn has_duplicate_options(options: &[ChoiceOptionId]) -> bool {
    let mut seen = BTreeSet::new();
    options.iter().any(|option| !seen.insert(*option))
}

fn fill_issue(
    fill: &Fill,
    fill_index: usize,
    open: &BTreeSet<HoleId>,
    previous_fills: &[Fill],
) -> BTreeSet<FillIssue> {
    let hole = fill_hole(fill);
    let duplicate = previous_fills.iter().any(|prior| fill_hole(prior) == hole);

    if duplicate {
        return issue(fill_index, hole, FillIssueCode::DuplicateFill);
    }
    if !open.contains(&hole) {
        return issue(fill_index, hole, FillIssueCode::UnknownHole);
    }
    if !fill_kind_matches_hole(fill, hole) {
        return issue(fill_index, hole, FillIssueCode::WrongFillKind);
    }

    match fill {
        Fill::Choice { options, .. } => {
            let mut issues = BTreeSet::new();
            if options.len() < required_choice_count(hole) {
                issues.insert(FillIssue {
                    fill_index,
                    hole,
                    code: FillIssueCode::TooFewChoices,
                });
            }
            if options.len() > required_choice_count(hole) {
                issues.insert(FillIssue {
                    fill_index,
                    hole,
                    code: FillIssueCode::TooManyChoices,
                });
            }

            if has_duplicate_options(options) || !all_options_in(options, &valid_options(hole)) {
                issues.insert(FillIssue {
                    fill_index,
                    hole,
                    code: FillIssueCode::InvalidChoice,
                });
            } else if !all_options_in(options, &supported_options(hole)) {
                issues.insert(FillIssue {
                    fill_index,
                    hole,
                    code: FillIssueCode::UnsupportedChoice,
                });
            }

            issues
        }
        Fill::AbilityScores { method, scores, .. } => {
            if is_valid_ability_score_assignment(*method, *scores) {
                BTreeSet::new()
            } else {
                issue(fill_index, hole, FillIssueCode::InvalidAbilityScores)
            }
        }
    }
}

fn issue(fill_index: usize, hole: HoleId, code: FillIssueCode) -> BTreeSet<FillIssue> {
    BTreeSet::from([FillIssue {
        fill_index,
        hole,
        code,
    }])
}

fn fill_issues_for_batch(fills: &[Fill], open: &BTreeSet<HoleId>) -> BTreeSet<FillIssue> {
    let mut prior = Vec::new();
    let mut issues = BTreeSet::new();

    for (fill_index, fill) in fills.iter().enumerate() {
        issues.extend(fill_issue(fill, fill_index, open, &prior));
        prior.push(fill.clone());
    }

    issues
}

fn is_valid_ability_score_assignment(
    method: SupportedAbilityScoreMethod,
    scores: AbilityScores,
) -> bool {
    match method {
        SupportedAbilityScoreMethod::StandardArray => is_standard_array_assignment(scores),
        SupportedAbilityScoreMethod::PointBuy => is_point_buy_assignment(scores),
    }
}

fn is_standard_array_assignment(scores: AbilityScores) -> bool {
    BTreeSet::from([
        scores.strength,
        scores.dexterity,
        scores.constitution,
        scores.intelligence,
        scores.wisdom,
        scores.charisma,
    ]) == BTreeSet::from([15, 14, 13, 12, 10, 8])
}

fn is_point_buy_assignment(scores: AbilityScores) -> bool {
    [
        scores.strength,
        scores.dexterity,
        scores.constitution,
        scores.intelligence,
        scores.wisdom,
        scores.charisma,
    ]
    .into_iter()
    .all(is_point_buy_score)
        && point_buy_total_cost(scores) <= 27
}

fn is_point_buy_score(score: i16) -> bool {
    (8..=15).contains(&score)
}

fn point_buy_total_cost(scores: AbilityScores) -> i16 {
    point_buy_cost(scores.strength)
        + point_buy_cost(scores.dexterity)
        + point_buy_cost(scores.constitution)
        + point_buy_cost(scores.intelligence)
        + point_buy_cost(scores.wisdom)
        + point_buy_cost(scores.charisma)
}

fn point_buy_cost(score: i16) -> i16 {
    match score {
        8 => 0,
        9 => 1,
        10 => 2,
        11 => 3,
        12 => 4,
        13 => 5,
        14 => 7,
        15 => 9,
        _ => 0,
    }
}

fn progression_selection(options: &[ChoiceOptionId]) -> ProgressionSelection {
    if options.contains(&ChoiceOptionId::ClassFighterLevel1) {
        ProgressionSelection::FighterLevel1
    } else if options.contains(&ChoiceOptionId::ClassFighterLevel2) {
        ProgressionSelection::FighterLevel2
    } else if options.contains(&ChoiceOptionId::ClassWizardLevel1) {
        ProgressionSelection::WizardLevel1
    } else {
        ProgressionSelection::None
    }
}

fn fighter_weapon_mastery_selection(
    options: &[ChoiceOptionId],
) -> Option<[WeaponUnitRef; FIGHTER_WEAPON_MASTERY_CHOICE_COUNT]> {
    match options {
        [first @ (ChoiceOptionId::WeaponLongsword
        | ChoiceOptionId::WeaponSpear
        | ChoiceOptionId::WeaponFlail), second @ (ChoiceOptionId::WeaponLongsword
        | ChoiceOptionId::WeaponSpear
        | ChoiceOptionId::WeaponFlail), third @ (ChoiceOptionId::WeaponLongsword
        | ChoiceOptionId::WeaponSpear
        | ChoiceOptionId::WeaponFlail)] => Some([
            weapon_unit_ref(*first)?,
            weapon_unit_ref(*second)?,
            weapon_unit_ref(*third)?,
        ]),
        _ => None,
    }
}

fn weapon_unit_ref(option: ChoiceOptionId) -> Option<WeaponUnitRef> {
    match option {
        ChoiceOptionId::WeaponLongsword => Some(WeaponUnitRef::Longsword),
        ChoiceOptionId::WeaponSpear => Some(WeaponUnitRef::Spear),
        ChoiceOptionId::WeaponFlail => Some(WeaponUnitRef::Flail),
        _ => None,
    }
}

fn apply_fill(draft: &mut Draft, fill: &Fill) {
    match fill {
        Fill::Choice { hole, options } => match hole {
            HoleId::Progression => draft.progression = progression_selection(options),
            HoleId::Background => draft.background = true,
            HoleId::Species => draft.species = true,
            HoleId::Languages => draft.languages = true,
            HoleId::Alignment => draft.alignment = true,
            HoleId::ClassSkills => draft.class_skills = true,
            HoleId::FighterFightingStyle => draft.fighter_fighting_style = true,
            HoleId::FighterWeaponMastery => {
                draft.fighter_weapon_mastery = fighter_weapon_mastery_selection(options)
            }
            HoleId::BackgroundAbilityScoreIncrease => {
                draft.background_ability_score_increase = true
            }
            HoleId::BackgroundTool => draft.background_tool = true,
            HoleId::ClassEquipment => draft.class_equipment = true,
            HoleId::BackgroundEquipment => draft.background_equipment = true,
            HoleId::EquipmentPurchase => draft.equipment_purchase = true,
            HoleId::LoadoutArmor => draft.loadout_armor = true,
            HoleId::LoadoutShield => draft.loadout_shield = true,
            HoleId::LoadoutWeapon => draft.loadout_weapon = true,
            HoleId::AbilityScores => {}
        },
        Fill::AbilityScores { scores, .. } => draft.ability_scores = Some(*scores),
    }
}

fn apply_accepted_batch(draft: &Draft, fills: &[Fill]) -> Draft {
    let mut next = draft.clone();
    for fill in fills {
        apply_fill(&mut next, fill);
    }
    next.revision = draft.revision + 1;
    next
}
