-- Tactical Master — SRD 5.2.1 Fighter level 9.
--
-- RAW (Classes / Fighter / Level 9: Tactical Master):
--   When you attack with a weapon whose mastery property you can use,
--   you can replace that property with Push, Sap, or Slow for that attack.

let tacticalMaster =
      { kind = "class_feature"
      , id = "fighter_tactical_master"
      , name = "Tactical Master"
      , className = "fighter"
      , acquiredAtLevel = 9
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Fighter.md:108-110" }

      , mechanics =
          { family = "weapon_mastery_property_replacement"
          , trigger =
              { kind = "attack_with_weapon_mastery_property_you_can_use" }
          , replacement =
              { timing = "for_that_attack"
              , chooseOne = [ "push", "sap", "slow" ]
              }
          }
      }

in  tacticalMaster
