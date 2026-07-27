let HunterOption : Type =
      { id : Text
      , trigger : { kind : Text }
      , targetPredicate : Optional Text
      , usageLimit : { kind : Text }
      , damage :
          Optional
            { kind : Text
            , dice : { dice : Natural, dieSize : Natural }
            , damageType : Text
            }
      , extraAttack :
          Optional
            { weapon : Text
            , target :
                { kind : Text
                , withinFeetOfOriginalTarget : Natural
                , withinWeaponRange : Bool
                , notAttackedThisTurn : Bool
                }
            }
      }

let huntersPrey =
      { kind = "class_feature"
      , id = "ranger_hunters_prey"
      , name = "Hunter's Prey"
      , className = "ranger"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Ranger.md:243-249" }

      , mechanics =
          { family = "hunters_prey"
          , choice =
              { kind = "choose_one", replaceOn = "short_or_long_rest" }
          , options =
            [ { id = "colossus_slayer"
              , trigger = { kind = "hit_creature_with_weapon" }
              , targetPredicate = Some "missing_any_hit_points"
              , usageLimit = { kind = "once_per_turn" }
              , damage =
                  Some
                    { kind = "add_attack_damage_dice"
                    , dice = { dice = 1, dieSize = 8 }
                    , damageType = "same_as_attack"
                    }
              , extraAttack =
                  None
                    { weapon : Text
                    , target :
                        { kind : Text
                        , withinFeetOfOriginalTarget : Natural
                        , withinWeaponRange : Bool
                        , notAttackedThisTurn : Bool
                        }
                    }
              }
            , { id = "horde_breaker"
              , trigger = { kind = "make_weapon_attack" }
              , targetPredicate = None Text
              , usageLimit = { kind = "once_per_turn" }
              , damage =
                  None
                    { kind : Text
                    , dice : { dice : Natural, dieSize : Natural }
                    , damageType : Text
                    }
              , extraAttack =
                  Some
                    { weapon = "same_weapon"
                    , target =
                        { kind = "different_creature_near_original_target"
                        , withinFeetOfOriginalTarget = 5
                        , withinWeaponRange = True
                        , notAttackedThisTurn = True
                        }
                      }
              }
            ] : List HunterOption
          }
      }

in  huntersPrey
