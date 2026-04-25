-- Maze — SRD 5.2.1 Spell, level 8, Conjuration.
--
-- RAW (Spells/Descriptions-M-P#Maze):
--   "You banish a creature that you can see within range into a
--    labyrinthine demiplane."
--   "The target remains there for the duration or until it escapes the
--    maze."
--   "The target can take a Study action to try to escape. When it does
--    so, it makes a DC 20 Intelligence (Investigation) check. If it
--    succeeds, it escapes, and the spell ends."
--
-- PARTIAL: reappearing in the original or nearest unoccupied space is
-- spatial/session-owned and follows the existing Banishment policy.

let target =
      { kind = "hole"
      , holeId = "maze_target"
      , label = "target creature"
      , value = { kind = "target", selection = { mode = "one" } }
      }

let maze =
      { kind = "spell"
      , id = "maze"
      , name = "Maze"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Maze"
          }
      , description =
          "You banish a creature that you can see within range into a labyrinthine demiplane. The target remains there for the duration or until it escapes. The target can take a Study action to make a DC 20 Intelligence (Investigation) check. On a success, it escapes and the spell ends. When the spell ends, the target reappears in the space it left or, if occupied, the nearest unoccupied space."
      , mechanics =
          { family = "ongoing_effect"
          , level = 8
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , attachment = target
          , initialPhase =
              { kind = "direct"
              , attachment = target
              , effects =
                  [ { kind = "transport_exile", destination = "demiplane" } ]
              }
          , operations =
              [ { trigger = { kind = "on_creature_studies" }
                , effect =
                    { kind = "ability_check_gate"
                    , ability = "int"
                    , dc = { kind = "fixed", dc = 20 }
                    , onPass = { kind = "end_current_effect" }
                    , onFail = { kind = "none" }
                    }
                }
              ]
          }
      }

in  maze
