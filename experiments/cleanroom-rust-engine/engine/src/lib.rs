//! Cleanroom Rust D&D rules engine experiment.
//!
//! This crate is intentionally empty of production TypeScript ports. Implement
//! rules from `../input/**` only.

pub mod battle;
pub mod character_creation;
pub mod types;

#[cfg(test)]
mod tests {
    #[test]
    fn cleanroom_crate_is_alive() {
        assert_eq!(2 + 2, 4);
    }
}
