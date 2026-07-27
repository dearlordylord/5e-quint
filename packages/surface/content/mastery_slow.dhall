-- Slow — SRD 5.2.1 Weapon Mastery property.
--
-- RAW (Equipment / Mastery Properties / Slow):
--   If you hit a creature with this weapon and deal damage to it, you can
--   reduce its Speed by 10 feet until the start of your next turn. Multiple
--   hits with this property don't reduce Speed by more than 10 feet.

let masterySlow =
      { kind = "mastery"
      , id = "mastery_slow"
      , name = "Slow"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Slow" }

      , mechanics =
          { family = "on_hit_trigger"
          , optional = True
          , trigger = { kind = "weapon_hit_with_damage" }
          , effect =
              { kind = "speed_delta"
              , deltaFeet = -10
              , maximumReductionFeet = 10
              , expiresOn = { kind = "start_of_attacker_next_turn" }
              }
          }
      }

in  masterySlow
