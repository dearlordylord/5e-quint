-- Uncanny Dodge — SRD 5.2.1 Rogue level 5.
--
-- RAW (Classes / Rogue / Level 5: Uncanny Dodge):
--   When an attacker you can see hits you with an attack roll, you can take
--   a Reaction to halve the attack's damage against you, rounded down.

let uncannyDodge =
      { id = "rogue_uncanny_dodge"
      , kind = "class_feature"
      , name = "Uncanny Dodge"
      , className = "rogue"
      , acquiredAtLevel = 5
      , description =
          "When an attacker you can see hits you with an attack roll, take a Reaction to halve the attack's damage against you."
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Rogue#Uncanny Dodge" }
      , mechanics =
          { family = "reaction_roll_or_damage_reduction"
          , modifiers =
              [ { kind = "attack_damage_reduction"
                , trigger =
                    { kind = "hit_by_attack_roll"
                    , requiresVisibleAttacker = True
                    }
                , reduction = { kind = "half_damage", rounding = "down" }
                }
              ]
          }
      }

in  uncannyDodge
