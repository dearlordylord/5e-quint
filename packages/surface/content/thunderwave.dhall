-- Thunderwave — SRD 5.2.1 Spell, level 1, Evocation.
--
-- RAW (Spells / Descriptions S-Z / Thunderwave):
--   "You unleash a wave of thunderous energy. Each creature in a
--    15-foot Cube originating from you makes a Constitution saving
--    throw. On a failed save, a creature takes 2d8 Thunder damage
--    and is pushed 10 feet away from you. On a successful save, a
--    creature takes half as much damage only."
--   "Using a Higher-Level Spell Slot. The damage increases by 1d8
--    for each spell slot level above 1."
--
-- SURFACE WIDENING REFERENCE (SRDINV44). The save_gate records
-- failed-save creature damage plus push and successful-save half damage.
-- The direct phase records the separate unsecured-object push and
-- audible thunderous boom facts without resolving push geometry, object
-- inventory state, or sound propagation.
let DiceExpr
    : Type
    = { dice : Natural, dieSize : Natural }

let DiceDelta
    : Type
    = { dice : Natural }

let DiceAmount
    : Type
    = { kind : Text
      , axis : Text
      , base : DiceExpr
      , perLevel : DiceDelta
      , startingAtLevel : Natural
      }

let SaveEffect
    : Type
    = { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , direction : Optional Text
      , movementKind : Optional Text
      , originDirection : Optional Text
      , distanceFeet : Optional Natural
      , effects :
          Optional
            ( List
                { kind : Text
                , damageType : Optional Text
                , amount : Optional DiceAmount
                , direction : Optional Text
                , movementKind : Optional Text
                , originDirection : Optional Text
                , distanceFeet : Optional Natural
                }
            )
      }

let SaveEffectLeaf
    : Type
    = { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , direction : Optional Text
      , movementKind : Optional Text
      , originDirection : Optional Text
      , distanceFeet : Optional Natural
      }

let DirectEffect
    : Type
    = { kind : Text
      , objectLocation : Optional Text
      , originDirection : Optional Text
      , distanceFeet : Optional Natural
      , sound : Optional Text
      , audibleRadiusFeet : Optional Natural
      }

let AreaAttachment
    : Type
    = { kind : Text
      , shape : { kind : Text, sideFeet : Natural }
      , origin : { kind : Text }
      }

let DcSource
    : Type
    = { kind : Text }

let Phase
    : Type
    = { kind : Text
      , attachment : AreaAttachment
      , ability : Optional Text
      , dc : Optional DcSource
      , onFail : Optional SaveEffect
      , onSuccess : Optional SaveEffect
      , effects : Optional (List DirectEffect)
      }

let noDiceAmount = None DiceAmount

let noSaveEffectLeaves = None (List SaveEffectLeaf)

let damageRider
    : SaveEffectLeaf
    = { kind = "damage"
      , damageType = Some "thunder"
      , amount = Some
        { kind = "linear_per_level"
        , axis = "slot"
        , base = { dice = 2, dieSize = 8 }
        , perLevel.dice = 1
        , startingAtLevel = 1
        }
      , direction = None Text
      , movementKind = None Text
      , originDirection = None Text
      , distanceFeet = None Natural
      }

let pushCreatureRider
    : SaveEffectLeaf
    = { kind = "force_move"
      , damageType = None Text
      , amount = noDiceAmount
      , direction = None Text
      , movementKind = Some "push"
      , originDirection = Some "away_from_caster"
      , distanceFeet = Some 10
      }

let failEffect
    : SaveEffect
    = { kind = "composite"
      , damageType = None Text
      , amount = noDiceAmount
      , direction = None Text
      , movementKind = None Text
      , originDirection = None Text
      , distanceFeet = None Natural
      , effects = Some [ damageRider, pushCreatureRider ]
      }

let halfDamageEffect
    : SaveEffect
    = { kind = "half_damage"
      , damageType = None Text
      , amount = noDiceAmount
      , direction = None Text
      , movementKind = None Text
      , originDirection = None Text
      , distanceFeet = None Natural
      , effects = noSaveEffectLeaves
      }

let pushUnsecuredObjects
    : DirectEffect
    = { kind = "push_unsecured_objects"
      , objectLocation = Some "entirely_within_area"
      , originDirection = Some "away_from_caster"
      , distanceFeet = Some 10
      , sound = None Text
      , audibleRadiusFeet = None Natural
      }

let thunderousBoom
    : DirectEffect
    = { kind = "audible"
      , objectLocation = None Text
      , originDirection = None Text
      , distanceFeet = None Natural
      , sound = Some "thunderous boom"
      , audibleRadiusFeet = Some 300
      }

let thunderwaveArea
    : AreaAttachment
    = { kind = "area"
      , shape = { kind = "cube", sideFeet = 15 }
      , origin.kind = "self"
      }

let savePhase
    : Phase
    = { kind = "save_gate"
      , attachment = thunderwaveArea
      , ability = Some "con"
      , dc = Some { kind = "caster_spell_save_dc" }
      , onFail = Some failEffect
      , onSuccess = Some halfDamageEffect
      , effects = None (List DirectEffect)
      }

let directAreaPhase
    : Phase
    = { kind = "direct"
      , attachment = thunderwaveArea
      , ability = None Text
      , dc = None DcSource
      , onFail = None SaveEffect
      , onSuccess = None SaveEffect
      , effects = Some [ pushUnsecuredObjects, thunderousBoom ]
      }

let thunderwave =
      { kind = "spell"
      , id = "thunderwave"
      , name = "Thunderwave"
      , provenance =
        { kind = "srd-5.2.1", section = "Spells/Descriptions-S-Z#Thunderwave" }
      , description =
          "You unleash a wave of thunderous energy. Each creature in a 15-foot Cube originating from you makes a Constitution saving throw. On a failed save, a creature takes 2d8 Thunder damage and is pushed 10 feet away from you. On a successful save, a creature takes half as much damage only. In addition, unsecured objects that are entirely within the Cube are pushed 10 feet away from you, and a thunderous boom is audible within 300 feet. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each spell slot level above 1."
      , mechanics =
        { family = "activation"
        , level = 1
        , school = "evocation"
        , castingTime.kind = "action"
        , range.kind = "self"
        , components = { v = True, s = True, m = False }
        , duration.kind = "instantaneous"
        , phases = [ savePhase, directAreaPhase ]
        }
      }

in  thunderwave
