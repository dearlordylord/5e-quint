//! Character creation module for the cleanroom experiment.
//!
//! Implement from `input/packages/character-creation-runtime/*.qnt` and SRD RAW.

use crate::types::AbilityScores;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CharacterLevelScope {
    Level1,
    Level2,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CharacterBuild {
    pub level_scope: CharacterLevelScope,
    pub ability_scores: AbilityScores,
}
