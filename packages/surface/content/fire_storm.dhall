-- Fire Storm — SRD 5.2.1 Spell, level 7, Evocation.
--
-- RAW (Spells/Descriptions-E-L#Fire Storm):
--   "The area of the storm consists of up to ten 10-foot Cubes,
--    which you arrange as you like. Each Cube must be contiguous with
--    at least one other Cube."
--   "Each creature in the area makes a Dexterity saving throw, taking
--    7d10 Fire damage on a failed save or half as much damage on a
--    successful one."
--   "Flammable objects in the area that aren't being worn or carried
--    start burning."

let DiceExpr : Type = { dice : Natural, dieSize : Natural }

let DiceAmount : Type = { kind : Text, expr : DiceExpr }

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , filter :
          Optional
            { material : Optional Text
            , targetRelation : Optional Text
            }
      }

let fireDamage : Effect =
      { kind = "damage"
      , damageType = Some "fire"
      , amount = Some { kind = "fixed", expr = { dice = 7, dieSize = 10 } }
      , filter =
          None
            { material : Optional Text
            , targetRelation : Optional Text
            }
      }

let halfDamage : Effect =
      { kind = "half_damage"
      , damageType = None Text
      , amount = None DiceAmount
      , filter =
          None
            { material : Optional Text
            , targetRelation : Optional Text
            }
      }

let igniteObjects : Effect =
      { kind = "ignite_objects"
      , damageType = None Text
      , amount = None DiceAmount
      , filter =
          Some
            { material = Some "flammable"
            , targetRelation = Some "not_worn_or_carried"
            }
      }

let AreaShape : Type =
      { kind : Text
      , maxCubes : Natural
      , sideFeet : Natural
      , contiguous : Optional Bool
      }

let Attachment : Type =
      { kind : Text
      , holeId : Optional Text
      , label : Optional Text
      , value :
          Optional
            { kind : Text
            , shape : AreaShape
            , origin : { kind : Text }
            }
      }

let stormArea : Attachment =
      { kind = "hole"
      , holeId = Some "fire_storm_area"
      , label = Some "storm area"
      , value =
          Some
            { kind = "area"
            , shape =
                { kind = "cube_cluster"
                , maxCubes = 10
                , sideFeet = 10
                , contiguous = Some True
                }
            , origin = { kind = "point_within_range" }
            }
      }

let Phase : Type =
      { kind : Text
      , attachment : Attachment
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional Effect
      , onSuccess : Optional Effect
      , effects : Optional (List Effect)
      }

let savePhase : Phase =
      { kind = "save_gate"
      , attachment = stormArea
      , ability = Some "dex"
      , dc = Some { kind = "caster_spell_save_dc" }
      , onFail = Some fireDamage
      , onSuccess = Some halfDamage
      , effects = None (List Effect)
      }

let ignitePhase : Phase =
      { kind = "direct"
      , attachment = stormArea
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None Effect
      , onSuccess = None Effect
      , effects = Some [ igniteObjects ]
      }

let fireStorm =
      { kind = "spell"
      , id = "fire_storm"
      , name = "Fire Storm"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Fire Storm"
          }
      , description =
          "A storm of fire appears within range. The area consists of up to ten contiguous 10-foot Cubes arranged as you like. Each creature in the area makes a Dexterity saving throw, taking 7d10 Fire damage on a failed save or half as much damage on a successful one. Flammable objects in the area that aren't being worn or carried start burning."
      , mechanics =
          { family = "activation"
          , level = 7
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 150 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases = [ savePhase, ignitePhase ]
          }
      }

in  fireStorm
