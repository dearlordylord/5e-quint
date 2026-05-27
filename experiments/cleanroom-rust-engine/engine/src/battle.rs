//! Battle module for the cleanroom experiment.
//!
//! Implement from `input/packages/**.qnt` and SRD RAW. Table-owned facts such as
//! spatial membership, target legality witnesses, and player choices must enter
//! as explicit inputs.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HitPoints {
    pub current: i16,
    pub maximum: i16,
    pub temporary: i16,
}

impl HitPoints {
    pub fn new(current: i16, maximum: i16, temporary: i16) -> Self {
        Self {
            current,
            maximum,
            temporary,
        }
    }
}
