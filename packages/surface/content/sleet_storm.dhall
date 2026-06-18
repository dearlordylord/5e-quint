-- Sleet Storm - SRD 5.2.1 Spell, level 3, Conjuration.
--
-- RAW (Spells/Descriptions-S-Z#Sleet Storm):
--   "Until the spell ends, sleet falls in a 40-foot-tall,
--    20-foot-radius Cylinder centered on a point you choose within range."
--   "The area is Heavily Obscured, and exposed flames in the area are doused."
--   "Ground in the Cylinder is Difficult Terrain."
--   "When a creature enters the Cylinder for the first time on a turn or
--    starts its turn there, it must succeed on a Dexterity saving throw or
--    have the Prone condition and lose Concentration."
--
-- Runtime boundary: this Spell Definition records the authored area hazard
-- facts. A promoted battle-runtime profile still needs to own the Sleet Storm
-- active Cylinder, table-supplied area membership triggers, Difficult Terrain
-- and Heavily Obscured projections, failed-save Prone application, failed-save
-- Concentration loss, and runtime-detached exposed-flame dousing split.

let SimpleEffect : Type =
      { kind : Text, condition : Optional Text }

let prone : SimpleEffect =
      { kind = "apply_condition", condition = Some "prone" }

let breakConcentration : SimpleEffect =
      { kind = "break_concentration", condition = None Text }

let SaveOutcome : Type =
      { kind : Text
      , condition : Optional Text
      , effects : Optional (List SimpleEffect)
      }

let noneOutcome : SaveOutcome =
      { kind = "none"
      , condition = None Text
      , effects = None (List SimpleEffect)
      }

let proneAndLoseConcentration : SaveOutcome =
      noneOutcome
        //  { kind = "composite"
            , effects = Some [ prone, breakConcentration ]
            }

let DcSource : Type = { kind : Text }

let Effect : Type =
      { kind : Text
      , ability : Optional Text
      , dc : Optional DcSource
      , onFail : Optional SaveOutcome
      , onSuccess : Optional SaveOutcome
      }

let noneEffect : Effect =
      { kind = "none"
      , ability = None Text
      , dc = None DcSource
      , onFail = None SaveOutcome
      , onSuccess = None SaveOutcome
      }

let areaIsHeavilyObscured : Effect =
      noneEffect // { kind = "area_is_heavily_obscured" }

let douseExposedFlames : Effect =
      noneEffect // { kind = "douse_exposed_flames" }

let areaIsDifficultTerrain : Effect =
      noneEffect // { kind = "area_is_difficult_terrain" }

let dexteritySave : Effect =
      noneEffect
        //  { kind = "save_gate"
            , ability = Some "dex"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail = Some proneAndLoseConcentration
            , onSuccess = Some noneOutcome
            }

let area =
      { kind = "hole"
      , holeId = "sleet_storm_cylinder"
      , label = "storm cylinder"
      , value =
          { kind = "area"
          , shape = { kind = "cylinder", radiusFeet = 20, heightFeet = 40 }
          , origin = { kind = "point_within_range" }
          }
      }

let Trigger : Type = { kind : Text }

let passive : Trigger = { kind = "passive" }

let UsageLimit : Type = { kind : Text, limitGroup : Optional Text }

let sharedSaveOncePerTurn =
      Some { kind = "once_per_turn", limitGroup = Some "sleet_storm_save_per_turn" }

let Operation : Type =
      { trigger : Trigger
      , effect : Effect
      , usageLimit : Optional UsageLimit
      }

let passiveOperation =
      \(effect : Effect) ->
        { trigger = passive, effect, usageLimit = None UsageLimit }

let sleetStorm =
      { kind = "spell"
      , id = "sleet_storm"
      , name = "Sleet Storm"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Sleet Storm"
          }
      , description =
          "Until the spell ends, sleet falls in a 40-foot-tall, 20-foot-radius Cylinder centered on a point you choose within range. The area is Heavily Obscured, and exposed flames in the area are doused. Ground in the Cylinder is Difficult Terrain. When a creature enters the Cylinder for the first time on a turn or starts its turn there, it must succeed on a Dexterity saving throw or have the Prone condition and lose Concentration."
      , mechanics =
          { family = "ongoing_effect"
          , level = 3
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 150 }
          , components = { v = True, s = True, m = Some "a miniature umbrella" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment = area
          , operations =
              [ passiveOperation areaIsHeavilyObscured
              , passiveOperation douseExposedFlames
              , passiveOperation areaIsDifficultTerrain
              , { trigger = { kind = "on_creature_enters_area" }
                , effect = dexteritySave
                , usageLimit = sharedSaveOncePerTurn
                }
              , { trigger = { kind = "on_creature_starts_turn_in_area" }
                , effect = dexteritySave
                , usageLimit = sharedSaveOncePerTurn
                }
              ] : List Operation
          }
      }

in  sleetStorm
