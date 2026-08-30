-- Plane Shift - SRD 5.2.1 Spell, level 7, Conjuration.
--
-- RAW (Spells/Descriptions-M-P#Plane Shift): the caster and up to eight
-- willing creatures linking hands are transported to another plane. Plane
-- destination and circle placement remain table-owned.

let planeShift =
      { kind = "spell"
      , id = "plane_shift"
      , name = "Plane Shift"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Plane Shift"
          }
      , mechanics =
          { family = "activation"
          , level = 7
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = "a forked, metal rod worth 250+ GP and attuned to a plane of existence"
              , materialCostGp = 250
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "plane_shift_travelers"
                    , label = "up to eight willing creatures"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count = 8
                            , targetKinds = [ "creature" ]
                            , disposition = "willing"
                            }
                        }
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  planeShift
