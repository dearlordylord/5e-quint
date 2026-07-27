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
          "You learn to use your wit to supernaturally distract, confuse, and otherwise sap the confidence and competence of others. When a creature that you can see within 60 feet of yourself makes a damage roll or succeeds on an ability check or attack roll, you can take a Reaction to expend one use of your Bardic Inspiration; roll your Bardic Inspiration die, and subtract the number rolled from the creature's roll, reducing the damage or potentially turning the success into a failure."
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
