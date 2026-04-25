-- Power Word Heal — SRD 5.2.1 Spell, level 9, Enchantment.
--
-- RAW (Spells/Descriptions-M-P#Power Word Heal):
--   "The target regains all its Hit Points."
--   "If the creature has the Charmed, Frightened, Paralyzed, Poisoned,
--    or Stunned condition, the condition ends."
--   "If the creature has the Prone condition, it can use its Reaction
--    to stand up."

let Effect : Type =
      { kind : Text
      , target : Optional Text
      , condition : Optional (List Text)
      }

let healAll : Effect =
      { kind = "heal_to_max_hp"
      , target = Some "target_creature"
      , condition = None (List Text)
      }

let cleanse : Effect =
      { kind = "remove_condition"
      , target = None Text
      , condition =
          Some [ "charmed", "frightened", "paralyzed", "poisoned", "stunned" ]
      }

let standUp : Effect =
      { kind = "allow_reaction_stand_up"
      , target = None Text
      , condition = None (List Text)
      }

let powerWordHeal =
      { kind = "spell"
      , id = "power_word_heal"
      , name = "Power Word Heal"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Power Word Heal"
          }
      , description =
          "A wave of healing energy washes over one creature you can see within range. The target regains all its Hit Points. If the creature has the Charmed, Frightened, Paralyzed, Poisoned, or Stunned condition, the condition ends. If the creature has the Prone condition, it can use its Reaction to stand up."
      , mechanics =
          { family = "activation"
          , level = 9
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = False, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "power_word_heal_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , effects =
                    [ { kind = "composite"
                      , effects = [ healAll, cleanse, standUp ]
                      }
                    ]
                }
              ]
          }
      }

in  powerWordHeal
