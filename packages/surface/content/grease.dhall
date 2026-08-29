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
-- The area is a two-dimensional ground square, not a Cube. Its Difficult
-- Terrain and recurring entry/end-turn saves last for the authored duration.

let Area =
      { kind = "hole"
      , holeId = "grease_point"
      , label = "spell origin point"
      , value =
          { kind = "area"
          , shape = { kind = "ground_square", sideFeet = 10 }
          , origin = { kind = "point_within_range" }
          }
      }

let ConditionEffect =
      { kind : Text
      , condition : Optional Text
      }

let noneConditionEffect : ConditionEffect =
      { kind = ""
      , condition = None Text
      }

let OperationEffect =
      { kind : Text
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional ConditionEffect
      , onSuccess : Optional { kind : Text }
      }

let saveEffect : OperationEffect =
      { kind = "save_gate"
      , ability = Some "dex"
      , dc = Some { kind = "caster_spell_save_dc" }
      , onFail = Some
          (noneConditionEffect // { kind = "apply_condition", condition = Some "prone" })
      , onSuccess = Some { kind = "none" }
      }

let difficultTerrain : OperationEffect =
      { kind = "area_is_difficult_terrain"
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None ConditionEffect
      , onSuccess = None { kind : Text }
      }

let grease =
      { kind = "spell"
      , id = "grease"
      , name = "Grease"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Grease"
          }

      , mechanics =
          { family = "ongoing_effect"
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
          , attachment = Area
          , initialPhase =
              { kind = "save_gate"
              , attachment = Area
                , ability = "dex"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition = "prone"
                    }
                , onSuccess = { kind = "none" }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect = difficultTerrain
                }
              , { trigger = { kind = "on_creature_enters_area" }
                , effect = saveEffect
                }
              , { trigger = { kind = "on_creature_ends_turn_in_area" }
                , effect = saveEffect
                }
              ]
          }
      }

in  grease
