-- Extra Attack — SRD 5.2.1 Ranger level 5.
--
-- RAW (Classes / Ranger / Level 5: Extra Attack):
--   "You can attack twice instead of once whenever you take the Attack
--    action on your turn."
--
-- Honest surface fit:
--   • ClassFeatureMechanics.passive
--   • scale_attack_count effect atom (+1 attack per Attack action)

let extraAttack =
      { kind = "class_feature"
      , id = "ranger_extra_attack"
      , name = "Extra Attack"
      , className = "ranger"
      , acquiredAtLevel = 5
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Ranger#Extra Attack"
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
