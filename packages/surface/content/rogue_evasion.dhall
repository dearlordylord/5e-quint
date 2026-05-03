-- Evasion — SRD 5.2.1 Rogue level 7.
--
-- RAW (Classes / Rogue / Level 7: Evasion):
--   When subjected to an effect that allows a Dexterity Saving Throw to take
--   only half damage, success means no damage and failure means half damage.
--
-- This record describes the reusable save-damage replacement procedure shape.
-- The battle runtime applies it from the Saving Throw outcome and the damage
-- procedure, not by dispatching on this Unit id.

let evasion =
      { id = "rogue_evasion"
      , kind = "class_feature"
      , name = "Evasion"
      , className = "rogue"
      , acquiredAtLevel = 7
      , description =
          "When a Dexterity Saving Throw would allow half damage, take no damage on success and half damage on failure."
      , provenance = { kind = "srd-5.2.1", section = "Classes/Rogue#Evasion" }
      , mechanics =
          { family = "save_damage_replacement"
          , trigger =
              { kind = "saving_throw_damage"
              , ability = "dex"
              , successDamage = "half_damage"
              }
          , replacement = { onSuccess = "no_damage", onFail = "half_damage" }
          , suppressedBy = [ { kind = "condition", condition = "incapacitated" } ]
          }
      }

in  evasion
