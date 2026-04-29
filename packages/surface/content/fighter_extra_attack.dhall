-- Extra Attack — SRD 5.2.1 Fighter level 5.
--
-- RAW (Classes / Fighter / Level 5: Extra Attack):
--   "You can attack twice instead of once whenever you take the Attack
--    action on your turn."
--
-- Honest surface fit:
--   • ClassFeatureMechanics.passive
--   • scale_attack_count effect atom (+1 attack per Attack action)
--
-- Fighter later gains larger attack-count scaling through additional
-- class features at higher levels; this level-5 unit is only the
-- first +1 step.

let extraAttack =
      { kind = "class_feature"
      , id = "fighter_extra_attack"
      , name = "Extra Attack"
      , className = "fighter"
      , acquiredAtLevel = 5
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Fighter#Extra Attack"
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
