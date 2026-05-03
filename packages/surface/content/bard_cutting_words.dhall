-- Cutting Words — SRD 5.2.1 Bard College of Lore level 3.
--
-- RAW (Classes / Bard / College of Lore / Level 3: Cutting Words):
--   When a creature you can see within 60 feet makes a damage roll or
--   succeeds on an ability check or attack roll, take a Reaction, expend one
--   Bardic Inspiration use, roll the Bardic Inspiration die, and subtract it.

let cuttingWords =
      { id = "bard_cutting_words"
      , kind = "class_feature"
      , name = "Cutting Words"
      , className = "bard"
      , acquiredAtLevel = 3
      , description =
          "When a creature you can see within 60 feet makes a damage roll or succeeds on an ability check or attack roll, take a Reaction to expend Bardic Inspiration and subtract the die roll."
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Bard#Cutting Words" }
      , mechanics =
          { family = "reaction_roll_or_damage_reduction"
          , resource =
              { kind = "use_count"
              , cap = { kind = "ability_modifier", ability = "cha" }
              }
          , resetCadence = { kind = "long_rest" }
          , modifiers =
              [ { kind = "attack_roll_reduction"
                , trigger =
                    { kind = "creature_succeeds_attack_roll"
                    , rangeFeet = 60
                    , requiresVisibleCreature = True
                    }
                , reduction = { kind = "bardic_inspiration_die" }
                }
              , { kind = "ability_check_reduction"
                , trigger =
                    { kind = "creature_succeeds_ability_check"
                    , rangeFeet = 60
                    , requiresVisibleCreature = True
                    }
                , reduction = { kind = "bardic_inspiration_die" }
                }
              , { kind = "damage_roll_reduction"
                , trigger =
                    { kind = "creature_makes_damage_roll"
                    , rangeFeet = 60
                    , requiresVisibleCreature = True
                    }
                , reduction = { kind = "bardic_inspiration_die" }
                }
              ]
          }
      }

in  cuttingWords
