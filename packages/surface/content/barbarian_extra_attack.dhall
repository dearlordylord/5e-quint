-- Extra Attack -- SRD 5.2.1 Barbarian level 5.
--
-- RAW (Classes / Barbarian / Level 5: Extra Attack):
--   "You can attack twice instead of once whenever you take the Attack
--    action on your turn."
--
-- Honest surface fit:
--   - ClassFeatureMechanics.passive
--   - scale_attack_count effect atom (+1 attack per Attack action)
--
-- This reuses the same level-5 Extra Attack owner as Fighter,
-- Paladin, and Ranger. It changes attack count inside the Attack
-- action; it does not grant a second Action or class-owned attack
-- state.

let extraAttack =
      { kind = "class_feature"
      , id = "barbarian_extra_attack"
      , name = "Extra Attack"
      , className = "barbarian"
      , acquiredAtLevel = 5
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Barbarian#Extra Attack"
          }
      , description =
          "You can attack twice instead of once whenever you take the Attack action on your turn."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "scale_attack_count", additional = 1 } ]
          }
      }

in  extraAttack
