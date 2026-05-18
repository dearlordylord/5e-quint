-- Spider Climb — SRD 5.2.1 Spell, level 2, Transmutation.
--
-- RAW (Spells / Descriptions S-Z / Spider Climb):
--   "Until the spell ends, one willing creature you touch gains the
--    ability to move up, down, and across vertical surfaces and along
--    ceilings, while leaving its hands free. The target also gains a
--    Climb Speed equal to its Speed."
--   "Using a Higher-Level Spell Slot. You can target one additional
--    creature for each spell slot level above 2."
--
-- §A14 VALIDATION REFERENCE. Exercises EffectAtom.grant_speed.feet =
-- LinkedSpeed walk_speed (Climb Speed equal to walk Speed). First SRD
-- unit where a granted speed is linked to a target-stat rather than
-- a fixed distance; motivates widening grant_speed.feet to
-- `number | LinkedSpeed`.
--
-- PARTIAL CARVEOUT: the "ability to move up, down, and across
-- vertical surfaces and along ceilings, while leaving its hands free"
-- is spatial geometry / movement semantics — DM-agenda per
-- ARCHITECTURE.md §1, not a surface atom. Only the Climb Speed grant
-- is modeled here.

let spiderClimb =
      { kind = "spell"
      , id = "spider_climb"
      , name = "Spider Climb"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Spider Climb"
          }
      , description =
          "Until the spell ends, one willing creature you touch gains the ability to move up, down, and across vertical surfaces and along ceilings, while leaving its hands free. The target also gains a Climb Speed equal to its Speed. Using a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 2."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "a drop of bitumen and a spider"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "spider_climb_target"
                    , label = "willing target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count =
                                { kind = "linear"
                                , base = 1
                                , perSlotAboveBase = 1
                                , baseLevel = 2
                                }
                            , targetKinds = [ "creature" ]
                            , disposition = "willing"
                            }
                        }
                    }
                , effects =
                    [ { kind = "grant_speed"
                      , speedKind = "climb"
                      , feet = { kind = "walk_speed" }
                      }
                    ]
                }
              ]
          }
      }

in  spiderClimb
