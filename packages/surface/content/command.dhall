-- Command - SRD 5.2.1 Spell, level 1, Enchantment.
--
-- RAW (Spells / Descriptions A-D / Command):
--   "You speak a one-word command to a creature you can see within
--    range. The target must succeed on a Wisdom saving throw or
--    follow the command on its next turn. Choose the command from
--    these options:"
--   Approach, Drop, Flee, Grovel, and Halt are a closed named-option
--   grammar. Their execution is on the target's next turn, not on
--   cast. Higher-level slots affect one additional creature per slot
--   level above 1.
--
-- SURFACE WIDENING REFERENCE (SRDINV42). The command_target_next_turn
-- atom records the authored option grammar without deriving route
-- geometry, pathfinding, held-item identity, or runtime turn execution.

let command =
      { kind = "spell"
      , id = "command"
      , name = "Command"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Command"
          }
      , description =
          "You speak a one-word command to a creature you can see within range. The target must succeed on a Wisdom saving throw or follow the command on its next turn. Choose the command from these options: Approach, Drop, Flee, Grovel, or Halt. Using a Higher-Level Spell Slot. You can affect one additional creature for each spell slot level above 1."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = False, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "command_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count =
                                { kind = "linear"
                                , base = 1
                                , perSlotAboveBase = 1
                                , baseLevel = 1
                                }
                            , targetKinds = [ "creature" ]
                            }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "command_target_next_turn"
                    , execution = "target_next_turn"
                    , options =
                        { approach =
                            { route = "shortest_direct_to_caster"
                            , endsTurnWhenWithinFeet = 5
                            }
                        , drop =
                            { objectSet = "held_objects"
                            , afterward = "end_turn"
                            }
                        , flee =
                            { direction = "away_from_caster"
                            , means = "fastest_available"
                            , duration = "target_turn"
                            }
                        , grovel =
                            { condition = "prone"
                            , afterward = "end_turn"
                            }
                        , halt =
                            { movement = "none"
                            , action = "none"
                            , bonusAction = "none"
                            , duration = "target_turn"
                            }
                        }
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  command
