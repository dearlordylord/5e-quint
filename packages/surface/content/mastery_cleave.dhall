-- Cleave — SRD 5.2.1 Mastery Property.
-- On-hit rider (melee only): make a free melee attack roll against a
-- second creature within 5 feet of the first and within reach.
-- Ability modifier is only applied to the second attack's damage if negative.
-- Cleave is optional (wielder chooses) and limited to once per turn.

let mastery_cleave =
      { kind = "mastery"
      , id = "mastery_cleave"
      , name = "Cleave"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Equipment#Cleave"
          }

      , mechanics =
          { family = "on_hit_trigger"
          , trigger = { kind = "weapon_hit_melee_only" }
          , optional = True
          , usageLimit = { kind = "once_per_turn" }
          , effect =
              { kind = "grant_weapon_attack"
              , attackKind = "melee_weapon_attack"
              , secondaryTarget =
                  { kind = "adjacent_to_primary"
                  , constraint = "within_5ft_and_reach"
                  }
              , onHit =
                  { kind = "weapon_damage"
                  , abilityModifier = "negative_only"
                  }
              }
          }
      }

in  mastery_cleave
