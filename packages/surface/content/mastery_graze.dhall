-- Graze — SRD 5.2.1 Mastery Property.
-- On a miss, the wielder can deal the attack ability modifier as damage of
-- the weapon's damage type; only that ability modifier can increase it.

let masteryGraze =
      { kind = "mastery"
      , id = "mastery_graze"
      , name = "Graze"
      , provenance = { kind = "srd-5.2.1", section = "Equipment#Graze" }
      , mechanics =
          { family = "weapon_attack_miss_damage"
          , optional = True
          , trigger = { kind = "weapon_attack_miss" }
          , effect =
              { kind = "deal_weapon_damage"
              , amount = { kind = "attack_ability_modifier" }
              , damageType = { kind = "weapon_damage_type" }
              , increaseLimit = "attack_ability_modifier_only"
              }
          }
      }

in  masteryGraze
