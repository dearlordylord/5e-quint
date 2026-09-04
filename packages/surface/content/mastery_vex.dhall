-- Vex — SRD 5.2.1 Mastery Property.
-- After a damaging weapon hit, the wielder has Advantage on its next attack
-- roll against that creature before the end of the wielder's next turn.

let masteryVex =
      { kind = "mastery"
      , id = "mastery_vex"
      , name = "Vex"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Vex" }
      , mechanics =
          { family = "on_hit_trigger"
          , optional = False
          , trigger = { kind = "weapon_hit_with_damage" }
          , effect =
              { kind = "modify_roll_advantage"
              , mode = "advantage"
              , on = [ "attack_roll" ]
              , count = 1
              , expiresOn = { kind = "end_of_next_turn" }
              }
          }
      }

in  masteryVex
