-- Storm of Vengeance — SRD 5.2.1 Spell, level 9, Conjuration.
--
-- RAW (Spells/Descriptions-S-Z#Storm of Vengeance):
--   "A churning storm cloud forms for the duration, centered on a point
--    within range and spreading to a radius of 300 feet."
--   "Each creature under the cloud when it appears must succeed on a
--    Constitution saving throw or take 2d6 Thunder damage and have the
--    Deafened condition for the duration."
--   "At the start of each of your later turns, the storm produces
--    different effects..."
--   "Turn 2. Acidic rain falls. Each creature and object under the cloud
--    takes 4d6 Acid damage."
--   "Turn 3. You call six bolts of lightning from the cloud to strike
--    six different creatures or objects beneath it. Each target makes a
--    Dexterity saving throw, taking 10d6 Lightning damage on a failed
--    save or half as much damage on a successful one."
--   "Turn 4. Hailstones rain down. Each creature under the cloud takes
--    2d6 Bludgeoning damage."
--   "Turns 5-10. Gusts and freezing rain assail the area under the
--    cloud. Each creature there takes 1d6 Cold damage. Until the spell
--    ends, the area is Difficult Terrain and Heavily Obscured, ranged
--    attacks with weapons are impossible there, and strong wind blows
--    through the area."

let DiceAmount : Type =
      { kind : Text, expr : { dice : Natural, dieSize : Natural, flat : Natural } }

let Atom : Type =
      { kind : Text
      , amount : Optional DiceAmount
      , damageType : Optional Text
      , condition : Optional Text
      , effects :
          Optional
            ( List
                { kind : Text
                , amount : Optional DiceAmount
                , damageType : Optional Text
                , condition : Optional Text
                }
            )
      }

let noneAtom =
      { amount = None DiceAmount
      , damageType = None Text
      , condition = None Text
      , effects =
          None
            ( List
                { kind : Text
                , amount : Optional DiceAmount
                , damageType : Optional Text
                , condition : Optional Text
                }
            )
      }

let fixedDamage =
      \(dice : Natural) ->
      \(dieSize : Natural) ->
      \(damageType : Text) ->
        noneAtom
          //  { kind = "damage"
              , amount =
                  Some
                    { kind = "fixed"
                    , expr = { dice = dice, dieSize = dieSize, flat = 0 }
                    }
              , damageType = Some damageType
              }

let thunderDamage = fixedDamage 2 6 "thunder"
let acidDamage = fixedDamage 4 6 "acid"
let lightningDamage = fixedDamage 10 6 "lightning"
let bludgeoningDamage = fixedDamage 2 6 "bludgeoning"
let coldDamage = fixedDamage 1 6 "cold"

let deafened =
      noneAtom // { kind = "apply_condition", condition = Some "deafened" }

let failOnAppearance : Atom =
      noneAtom
        //  { kind = "composite"
            , effects =
                Some
                  [ thunderDamage.{ kind, amount, damageType, condition }
                  , deafened.{ kind, amount, damageType, condition }
                  ]
            }

let terrain =
      noneAtom // { kind = "area_is_difficult_terrain" }

let obscured =
      noneAtom // { kind = "area_is_heavily_obscured" }

let rangedWeaponAttacksImpossible =
      noneAtom // { kind = "prevent_ranged_weapon_attacks" }

let strongWind =
      noneAtom // { kind = "area_has_strong_wind" }

let lateStorm : Atom =
      noneAtom
        //  { kind = "composite"
            , effects =
                Some
                  [ coldDamage.{ kind, amount, damageType, condition }
                  , terrain.{ kind, amount, damageType, condition }
                  , obscured.{ kind, amount, damageType, condition }
                  , rangedWeaponAttacksImpossible.{ kind, amount, damageType, condition }
                  , strongWind.{ kind, amount, damageType, condition }
                  ]
            }

let SaveEffect : Type =
      { kind : Text
      , ability : Text
      , dc : { kind : Text }
      , onFail : Atom
      , onSuccess : { kind : Text }
      }

let appearanceSave : SaveEffect =
      { kind = "save_gate"
      , ability = "con"
      , dc = { kind = "caster_spell_save_dc" }
      , onFail = failOnAppearance
      , onSuccess = { kind = "none" }
      }

let lightningSave : SaveEffect =
      { kind = "save_gate"
      , ability = "dex"
      , dc = { kind = "caster_spell_save_dc" }
      , onFail = lightningDamage
      , onSuccess = { kind = "half_damage" }
      }

let Effect : Type =
      { kind : Text
      , amount : Optional DiceAmount
      , damageType : Optional Text
      , condition : Optional Text
      , effects :
          Optional
            ( List
                { kind : Text
                , amount : Optional DiceAmount
                , damageType : Optional Text
                , condition : Optional Text
                }
            )
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional Atom
      , onSuccess : Optional { kind : Text }
      }

let atomEffect =
      \(atom : Atom) ->
        atom
        //  { ability = None Text
            , dc = None { kind : Text }
            , onFail = None Atom
            , onSuccess = None { kind : Text }
            }

let saveEffect =
      \(save : SaveEffect) ->
        noneAtom
        //  { kind = save.kind
            , ability = Some save.ability
            , dc = Some save.dc
            , onFail = Some save.onFail
            , onSuccess = Some save.onSuccess
            }

let stormArea =
      { kind = "hole"
      , holeId = "storm_of_vengeance_cloud"
      , label = "storm cloud"
      , value =
          { kind = "area"
          , shape = { kind = "sphere", radiusFeet = 300 }
          , origin = { kind = "point_within_range" }
          }
      }

let TurnWindow : Type =
      { kind : Text
      , turn : Optional Natural
      , from : Optional Natural
      , to : Optional Natural
      }

let turn =
      \(n : Natural) ->
        { kind = "effect_turn"
        , turn = Some n
        , from = None Natural
        , to = None Natural
        }

let turnRange =
      \(from : Natural) ->
      \(to : Natural) ->
        { kind = "effect_turn_range"
        , turn = None Natural
        , from = Some from
        , to = Some to
        }

let Trigger : Type =
      { kind : Text, turnWindow : Optional TurnWindow }

let casterTurn =
      \(window : TurnWindow) ->
        { kind = "on_caster_turn_start", turnWindow = Some window }

let TargetLimit : Type =
      { count : Natural, distinct : Bool, targetTypes : List Text }

let Operation : Type =
      { trigger : Trigger
      , targetLimit : Optional TargetLimit
      , effect : Effect
      }

let stormOfVengeance =
      { kind = "spell"
      , id = "storm_of_vengeance"
      , name = "Storm of Vengeance"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Storm of Vengeance"
          }
      , description =
          "A churning storm cloud forms for the duration, centered on a point within range and spreading to a radius of 300 feet. Each creature under the cloud when it appears makes a Constitution saving throw or takes 2d6 Thunder damage and has the Deafened condition for the duration. At the start of later turns, the storm changes: turn 2 deals 4d6 Acid damage to each creature and object under it; turn 3 strikes six different creatures or objects with lightning, each making a Dexterity saving throw for 10d6 Lightning damage or half on success; turn 4 deals 2d6 Bludgeoning damage to each creature under it; turns 5-10 deal 1d6 Cold damage to each creature there, and until the spell ends the area is Difficult Terrain and Heavily Obscured, ranged attacks with weapons are impossible there, and strong wind blows through it."
      , mechanics =
          { family = "ongoing_effect"
          , level = 9
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 5280 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment = stormArea
          , initialPhase =
              saveEffect appearanceSave
                //  { attachment = stormArea }
          , operations =
              [ { trigger = casterTurn (turn 2)
                , targetLimit = None TargetLimit
                , effect = atomEffect acidDamage
                }
              , { trigger = casterTurn (turn 3)
                , targetLimit =
                    Some
                      { count = 6
                      , distinct = True
                      , targetTypes = [ "creature", "object" ]
                      }
                , effect = saveEffect lightningSave
                }
              , { trigger = casterTurn (turn 4)
                , targetLimit = None TargetLimit
                , effect = atomEffect bludgeoningDamage
                }
              , { trigger = casterTurn (turnRange 5 10)
                , targetLimit = None TargetLimit
                , effect = atomEffect lateStorm
                }
              ] : List Operation
          }
      }

in  stormOfVengeance
