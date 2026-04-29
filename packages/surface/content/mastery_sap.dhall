-- Sap — SRD 5.2.1 Mastery Property.
-- On-hit rider: target has Disadvantage on its next attack roll
-- before the start of the attacker's next turn.
-- Sap is always-on (optional = False) with no once-per-turn usage limit.

let sap =
      { kind = "mastery"
      , id = "mastery_sap"
      , name = "Sap"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Equipment#Sap"
          }
      , description =
          "If you hit a creature with this weapon, that creature has Disadvantage on its next attack roll before the start of your next turn."
      , mechanics =
          { family = "on_hit_trigger"
          , trigger = { kind = "weapon_hit" }
          , optional = False
          , effect =
              { kind = "modify_roll_advantage"
              , mode = "disadvantage"
              , on = [ "attack_roll" ]
              , count = 1
              , expiresOn = { kind = "target_uses_or_turn_start" }
              }
          }
      }

in  sap
