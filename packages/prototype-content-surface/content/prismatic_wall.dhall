-- Prismatic Wall — SRD 5.2.1 Spell, level 9, Abjuration.
--
-- RAW (Spells/Descriptions-M-P#Prismatic Wall):
--   Seven ordered colored layers, each forcing a Dexterity save when a
--   creature reaches into or passes through the wall; each layer has
--   its own effect and destruction condition. Indigo uses the same
--   three-success / three-failure save counter as Flesh to Stone.

let DiceAmount : Type =
      { kind : Text, expr : { dice : Natural, dieSize : Natural, flat : Natural } }

let Simple : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , condition : Optional Text
      , destination : Optional Text
      , projectile : Optional Text
      , spellId : Optional Text
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , cadence : Optional Text
      , appliesCondition : Optional Bool
      , successCount : Optional Natural
      , failureCount : Optional Natural
      , onSuccessCount : Optional { kind : Text }
      , onFailureCount : Optional { kind : Text, condition : Text }
      , onSuccess : Optional { kind : Text, condition : Optional Text }
      , onFailure :
          Optional
            { kind : Text
            , effects :
                List
                  { kind : Text
                  , condition : Optional Text
                  , destination : Optional Text
                  }
            }
      , effects :
          Optional
            ( List
                { kind : Text
                , condition : Optional Text
                , destination : Optional Text
                }
            )
      }

let none =
      { damageType = None Text
      , amount = None DiceAmount
      , condition = None Text
      , destination = None Text
      , projectile = None Text
      , spellId = None Text
      , ability = None Text
      , dc = None { kind : Text }
      , cadence = None Text
      , appliesCondition = None Bool
      , successCount = None Natural
      , failureCount = None Natural
      , onSuccessCount = None { kind : Text }
      , onFailureCount = None { kind : Text, condition : Text }
      , onSuccess = None { kind : Text, condition : Optional Text }
      , onFailure =
          None
            { kind : Text
            , effects :
                List
                  { kind : Text
                  , condition : Optional Text
                  , destination : Optional Text
                  }
            }
      , effects =
          None
            ( List
                { kind : Text
                , condition : Optional Text
                , destination : Optional Text
                }
            )
      }

let damage =
      \(damageType : Text) ->
        none
        //  { kind = "damage"
            , damageType = Some damageType
            , amount =
                Some
                  { kind = "fixed"
                  , expr = { dice = 12, dieSize = 6, flat = 0 }
                  }
            }

let condition =
      \(name : Text) ->
        none // { kind = "apply_condition", condition = Some name }

let removeCondition =
      \(name : Text) ->
        none // { kind = "remove_condition", condition = Some name }

let transportDifferentPlane =
      none // { kind = "transport_exile", destination = Some "different_plane" }

let indigoFail : Simple =
      none
        //  { kind = "repeat_save_counter"
            , condition = Some "restrained"
            , ability = Some "con"
            , dc = Some { kind = "caster_spell_save_dc" }
            , cadence = Some "end_of_target_turn"
            , appliesCondition = Some True
            , successCount = Some 3
            , failureCount = Some 3
            , onSuccessCount = Some { kind = "end_current_effect" }
            , onFailureCount = Some { kind = "apply_condition", condition = "petrified" }
            }

let indigoCounter : Simple =
      none
        //  { kind = "repeat_save_counter"
            , condition = Some "restrained"
            , ability = Some "con"
            , dc = Some { kind = "caster_spell_save_dc" }
            , cadence = Some "end_of_target_turn"
            , appliesCondition = Some True
            , successCount = Some 3
            , failureCount = Some 3
            , onSuccessCount = Some { kind = "end_current_effect" }
            , onFailureCount = Some { kind = "apply_condition", condition = "petrified" }
            }

let violetFail : Simple =
      none
        //  { kind = "delayed_save"
            , condition = Some "blinded"
            , ability = Some "wis"
            , dc = Some { kind = "caster_spell_save_dc" }
            , cadence = Some "start_of_caster_next_turn"
            , onSuccess = Some { kind = "remove_condition", condition = Some "blinded" }
            , onFailure =
                Some
                  { kind = "composite"
                  , effects =
                      [ { kind = "remove_condition"
                        , condition = Some "blinded"
                        , destination = None Text
                        }
                      , { kind = "transport_exile"
                        , condition = None Text
                        , destination = Some "different_plane"
                        }
                      ]
                  }
            }

let violetDelayedSave : Simple =
      none
        //  { kind = "delayed_save"
            , ability = Some "wis"
            , dc = Some { kind = "caster_spell_save_dc" }
            , cadence = Some "start_of_caster_next_turn"
            , onSuccess = Some { kind = "remove_condition", condition = Some "blinded" }
            , onFailure =
                Some
                  { kind = "composite"
                  , effects =
                      [ { kind = "remove_condition"
                        , condition = Some "blinded"
                        , destination = None Text
                        }
                      , { kind = "transport_exile"
                        , condition = None Text
                        , destination = Some "different_plane"
                        }
                      ]
                  }
            }

let Layer : Type =
      { order : Natural
      , label : Text
      , save :
          Optional
            { ability : Text
            , dc : { kind : Text }
            , onFail : Simple
            , onSuccess : { kind : Text }
            }
      , passiveEffects : Optional (List Simple)
      , destroyedBy : Text
      }

let layer =
      \(order : Natural) ->
      \(label : Text) ->
      \(onFail : Simple) ->
      \(passives : List Simple) ->
      \(destroyedBy : Text) ->
        { order = order
        , label = label
        , save =
            Some
              { ability = "dex"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail = onFail
              , onSuccess = { kind = "half_damage" }
              }
        , passiveEffects = Some passives
        , destroyedBy = destroyedBy
        }

let indigoLayer : Layer =
      { order = 6
      , label = "indigo"
      , save =
          Some
            { ability = "dex"
            , dc = { kind = "caster_spell_save_dc" }
            , onFail =
                indigoFail
            , onSuccess = { kind = "none" }
            }
      , passiveEffects =
          Some [ none // { kind = "prevent_spellcasting_and_magic_actions" } ]
      , destroyedBy = "bright light shed by Daylight"
      }

let violetLayer : Layer =
      { order = 7
      , label = "violet"
      , save =
          Some
            { ability = "dex"
            , dc = { kind = "caster_spell_save_dc" }
            , onFail = violetFail
            , onSuccess = { kind = "none" }
            }
      , passiveEffects =
          Some
            [ none // { kind = "object_destroyed_by_spell", spellId = Some "dispel_magic" }
            ]
      , destroyedBy = "Dispel Magic"
      }

let wallShape =
      { kind = "choice"
      , options =
          [ { kind = "wall_volume"
            , maxLengthFeet = Some 90.0
            , maxHeightFeet = Some 30.0
            , thicknessFeet = Some 0.0833333
            , radiusFeet = None Double
            }
          , { kind = "sphere"
            , radiusFeet = Some 15.0
            , maxLengthFeet = None Double
            , maxHeightFeet = None Double
            , thicknessFeet = None Double
            }
          ]
      }

let prismaticWallArea =
      { kind = "hole"
      , holeId = "prismatic_wall_area"
      , label = "prismatic wall"
      , value =
          { kind = "area"
          , shape = wallShape
          , origin = { kind = "point_within_range" }
          }
      }

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , condition : Optional Text
      , destination : Optional Text
      , projectile : Optional Text
      , spellId : Optional Text
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , cadence : Optional Text
      , appliesCondition : Optional Bool
      , successCount : Optional Natural
      , failureCount : Optional Natural
      , onSuccessCount : Optional { kind : Text }
      , onFailureCount : Optional { kind : Text, condition : Text }
      , onSuccess : Optional { kind : Text, condition : Optional Text }
      , onFailure :
          Optional
            { kind : Text
            , effects :
                List
                  { kind : Text
                  , condition : Optional Text
                  , destination : Optional Text
                  }
            }
      , onFail : Optional Simple
      , effects :
          Optional
            ( List
                { kind : Text
                , condition : Optional Text
                , destination : Optional Text
                }
            )
      , brightRadiusFeet : Optional Natural
      , dimAdditionalFeet : Optional Natural
      , layers : Optional (List Layer)
      }

let plain =
      \(kind : Text) ->
        none
        //  { kind = kind
            , onFail = None Simple
            , brightRadiusFeet = None Natural
            , dimAdditionalFeet = None Natural
            , layers = None (List Layer)
            }

let lightEffect : Effect =
      none
        //  { kind = "emit_light"
            , onFail = None Simple
            , brightRadiusFeet = Some 100
            , dimAdditionalFeet = Some 100
            , layers = None (List Layer)
            }

let layersEffect : Effect =
      none
        //  { kind = "ordered_barrier_layers"
            , onFail = None Simple
            , brightRadiusFeet = None Natural
            , dimAdditionalFeet = None Natural
            , layers =
                Some
                  [ layer 1 "red" (damage "fire")
                      [ none // { kind = "block_projectiles", projectile = Some "ordinary" }
                      ]
                      "takes at least 25 Cold damage"
                  , layer 2 "orange" (damage "acid")
                      [ none // { kind = "prevent_magical_ranged_attacks" } ]
                      "strong wind"
                  , layer 3 "yellow" (damage "lightning")
                      ([] : List Simple) "takes at least 60 Force damage"
                  , layer 4 "green" (damage "poison")
                      ([] : List Simple) "Passwall or equal/greater portal-opening spell"
                  , layer 5 "blue" (damage "cold")
                      ([] : List Simple) "takes at least 25 Fire damage"
                  , indigoLayer
                  , violetLayer
                  ]
            }

let blindNearbySave : Effect =
      none
        //  { kind = "save_gate"
            , ability = Some "con"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail = Some (condition "blinded")
            , onSuccess = Some { kind = "none", condition = None Text }
            , brightRadiusFeet = None Natural
            , dimAdditionalFeet = None Natural
            , layers = None (List Layer)
            }

let Operation : Type =
      { trigger : { kind : Text, distanceFeet : Optional Natural }
      , effect : Effect
      }

let prismaticWall =
      { kind = "spell"
      , id = "prismatic_wall"
      , name = "Prismatic Wall"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Prismatic Wall"
          }
      , description =
          "A shimmering, multicolored plane of light forms a vertical opaque wall up to 90 feet long, 30 feet high, and 1 inch thick, or a globe up to 30 feet in diameter. If positioned in an occupied space, the spell ends without effect. The wall sheds Bright Light within 100 feet and Dim Light for an additional 100 feet. You and designated creatures can pass through and be near it without harm. Other creatures that can see it and move within 20 feet or start their turn there make a Constitution save or have the Blinded condition for 1 minute. The wall has seven ordered layers, each with its own Dexterity-save effect and destruction condition."
      , mechanics =
          { family = "ongoing_effect"
          , level = 9
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "timed", value = { unit = "minute", amount = 10 } }
          , attachment = prismaticWallArea
          , operations =
              [ { trigger = { kind = "passive", distanceFeet = None Natural }
                , effect = plain "end_if_created_in_occupied_space"
                }
              , { trigger = { kind = "passive", distanceFeet = None Natural }
                , effect = lightEffect
                }
              , { trigger = { kind = "passive", distanceFeet = None Natural }
                , effect = plain "allow_designated_creatures_safe_passage"
                }
              , { trigger = { kind = "passive", distanceFeet = None Natural }
                , effect = plain "block_line_of_sight"
                }
              , { trigger = { kind = "passive", distanceFeet = None Natural }
                , effect = layersEffect
                }
              , { trigger =
                    { kind = "on_creature_moves_within_area"
                    , distanceFeet = Some 20
                    }
                , effect = blindNearbySave
                }
              , { trigger =
                    { kind = "on_creature_starts_turn_within_area"
                    , distanceFeet = Some 20
                    }
                , effect = blindNearbySave
                }
              ] : List Operation
          }
      }

in  prismaticWall
