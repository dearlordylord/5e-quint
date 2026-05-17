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
-- Runtime profile boundary:
--   * the spell creates an active ground hazard keyed by caller-supplied
--     ground-area identity;
--   * on-cast, enter-area, and end-turn-in-area Dexterity Saving Throws
--     consume caller-supplied affected/triggering creature facts;
--   * failed Grease saves apply the Prone condition;
--   * caller-supplied Difficult Terrain movement facts validate the
--     active hazard identity and spend total Movement distance plus one
--     extra foot per foot moved through Grease.
--
-- Automatic area membership, pathfinding, and grid geometry derivation
-- remain runtime-detached table/spatial derivations.
--
-- Area is modeled with area shape "cube" (sideFeet = 10). The RAW
-- "10-foot square" is a 2-D ground footprint, and the Surface area shape
-- vocabulary has no square primitive.

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
