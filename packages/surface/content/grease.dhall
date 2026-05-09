-- Grease — SRD 5.2.1 Spell, level 1, Conjuration.
--
-- RAW (Spells / Descriptions E-L / Grease):
--   "Nonflammable grease covers the ground in a 10-foot square
--    centered on a point within range and turns it into Difficult
--    Terrain for the duration."
--   "When the grease appears, each creature standing in its area must
--    succeed on a Dexterity saving throw or have the Prone condition.
--    A creature that enters the area or ends its turn there must also
--    succeed on that save or fall Prone."
--
-- PARTIAL AUTHOR, NOT A SUPPORTED RUNTIME PROFILE. The on-cast
-- save_gate (Dex → Prone, affects creatures standing in area at cast
-- time) is authored, but the Unit profile matrix keeps Grease
-- unsupported until battle-runtime has an active ground-area lifecycle
-- and executable later procedures for creatures that enter the area or
-- end turns there, with table-supplied area-membership facts.
--
-- Area is modeled with area shape "cube" (10-foot square —
-- sphere/cube is the closest RAW-matching shape for a 10ft ground
-- square; the surface has no 2-d square primitive, closed set per
-- AREA_SHAPES).
--
-- Modeled as a 10-foot cube (sideFeet = 10) — the RAW "10-foot square"
-- is a 2-D footprint, but the surface's closed AREA_SHAPES list lacks
-- a square primitive. Cube is the minimal RAW-faithful container.
--
-- DEFERRED.
--   1. "Difficult Terrain for the duration" — difficult terrain /
--      movement-cost is §B spatial agenda (sibling to terrain rulings).
--   2. "A creature that enters the area or ends its turn there must
--      also succeed on that save or fall Prone" — recurring per-event
--      save (enter-area OR end-turn-in-area) requires promoted
--      battle-runtime active area state plus table-supplied
--      membership facts at those later event boundaries. Storing the
--      original spell area by itself is not support.

let grease =
      { kind = "spell"
      , id = "grease"
      , name = "Grease"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Grease"
          }
      , description =
          "Nonflammable grease covers the ground in a 10-foot square centered on a point within range and turns it into Difficult Terrain for the duration. When the grease appears, each creature standing in its area must succeed on a Dexterity saving throw or have the Prone condition. A creature that enters the area or ends its turn there must also succeed on that save or fall Prone."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True
              , s = True
              , m = Some "a bit of pork rind or butter"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "grease_point"
                    , label = "spell origin point"
                    , value =
                        { kind = "area"
                        , shape = { kind = "cube", sideFeet = 10 }
                        , origin = { kind = "point_within_range" }
                        }
                    }
                , ability = "dex"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition = "prone"
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  grease
