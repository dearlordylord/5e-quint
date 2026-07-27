-- Find Traps - SRD 5.2.1 Spell, level 2, Divination.
--
-- RAW (Spells/Descriptions-E-L#Find Traps):
--   "You sense any trap within range that is within line of sight. A
--    trap, for the purpose of this spell, includes any object or mechanism
--    that was created to cause damage or other danger."
--   "This spell reveals that a trap is present but not its location. You do
--    learn the general nature of the danger posed by a trap you sense."
--
-- Trap qualification, line of sight, the non-location warning, and the
-- general nature of the danger are exploration/table information facts. This
-- Spell Definition preserves them in the SRD description without promoting a
-- battle-runtime profile for trap-world-state discovery.

let rangeFeet = 120

let findTraps =
      { kind = "spell"
      , id = "find_traps"
      , name = "Find Traps"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Find Traps"
          }

      , mechanics =
          { family = "activation"
          , level = 2
          , school = "divination"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = rangeFeet }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "detect"
                      , property = "traps"
                      , radiusFeet = rangeFeet
                      }
                    ]
                }
              ]
          }
      }

in  findTraps
