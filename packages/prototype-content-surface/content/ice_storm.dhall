-- Ice Storm — SRD 5.2.1 Spell, level 4, Evocation.
--
-- RAW (Spells/Descriptions-E-L#Ice Storm):
--   "Each creature in the Cylinder makes a Dexterity saving throw."
--   "A creature takes 2d10 Bludgeoning damage and 4d6 Cold damage on
--    a failed save or half as much damage on a successful one."
--   "Hailstones turn ground in the Cylinder into Difficult Terrain
--    until the end of your next turn."
--   "The Bludgeoning damage increases by 1d10 for each spell slot
--    level above 4."

let DiceExpr : Type = { dice : Natural, dieSize : Natural }

let DiceExprDelta : Type = { dice : Natural, dieSize : Optional Natural }

let DiceAmount : Type =
      { kind : Text
      , expr : Optional DiceExpr
      , axis : Optional Text
      , base : Optional DiceExpr
      , perLevel : Optional DiceExprDelta
      , startingAtLevel : Optional Natural
      }

let DamageEffect : Type =
      { kind : Text
      , damageType : Text
      , amount : DiceAmount
      }

let bludgeoningDamage : DamageEffect =
      { kind = "damage"
      , damageType = "bludgeoning"
      , amount =
          { kind = "linear_per_level"
          , expr = None DiceExpr
          , axis = Some "slot"
          , base = Some { dice = 2, dieSize = 10 }
          , perLevel = Some { dice = 1, dieSize = Some 10 }
          , startingAtLevel = Some 4
          }
      }

let coldDamage : DamageEffect =
      { kind = "damage"
      , damageType = "cold"
      , amount =
          { kind = "fixed"
          , expr = Some { dice = 4, dieSize = 6 }
          , axis = None Text
          , base = None DiceExpr
          , perLevel = None DiceExprDelta
          , startingAtLevel = None Natural
          }
      }

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , effects : Optional (List DamageEffect)
      }

let compositeDamage : Effect =
      { kind = "composite"
      , damageType = None Text
      , amount = None DiceAmount
      , effects = Some [ bludgeoningDamage, coldDamage ]
      }

let halfDamage : Effect =
      { kind = "half_damage"
      , damageType = None Text
      , amount = None DiceAmount
      , effects = None (List DamageEffect)
      }

let difficultTerrain : Effect =
      { kind = "area_is_difficult_terrain"
      , damageType = None Text
      , amount = None DiceAmount
      , effects = None (List DamageEffect)
      }

let Cylinder : Type =
      { kind : Text, radiusFeet : Natural, heightFeet : Natural }

let Attachment : Type =
      { kind : Text
      , holeId : Optional Text
      , label : Optional Text
      , value :
          Optional
            { kind : Text
            , shape : Cylinder
            , origin : { kind : Text }
            }
      }

let areaAttachment : Attachment =
      { kind = "hole"
      , holeId = Some "ice_storm_cylinder"
      , label = Some "storm cylinder"
      , value =
          Some
            { kind = "area"
            , shape = { kind = "cylinder", radiusFeet = 20, heightFeet = 40 }
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
      , attachment = areaAttachment
      , ability = Some "dex"
      , dc = Some { kind = "caster_spell_save_dc" }
      , onFail = Some compositeDamage
      , onSuccess = Some halfDamage
      , effects = None (List Effect)
      }

let terrainPhase : Phase =
      { kind = "direct"
      , attachment = areaAttachment
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None Effect
      , onSuccess = None Effect
      , effects = Some [ difficultTerrain ]
      }

let iceStorm =
      { kind = "spell"
      , id = "ice_storm"
      , name = "Ice Storm"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Ice Storm"
          }
      , description =
          "Hail falls in a 20-foot-radius, 40-foot-high Cylinder centered on a point within range. Each creature in the Cylinder makes a Dexterity saving throw, taking 2d10 Bludgeoning damage and 4d6 Cold damage on a failed save or half as much damage on a successful one. The ground in the Cylinder becomes Difficult Terrain until the end of your next turn. Using a Higher-Level Spell Slot. The Bludgeoning damage increases by 1d10 for each spell slot level above 4."
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 300 }
          , components = { v = True, s = True, m = Some "a mitten" }
          , duration = { kind = "instantaneous" }
          , phases = [ savePhase, terrainPhase ]
          }
      }

in  iceStorm
