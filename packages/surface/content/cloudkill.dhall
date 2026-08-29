-- Cloudkill — SRD 5.2.1 Spell, Level 5, Conjuration.
-- Family: ongoing_effect.
--
-- The area identity, movement membership triggers, and strong-wind
-- dispersal predicate are table/spatial/environment witnesses. The
-- spell record still carries the typed rule facts the battle runtime
-- consumes: active Sphere, Heavily Obscured projection, Constitution
-- save-for-half Poison damage, and once-per-turn area triggers.

let SaveDamage =
      { kind : Text
      , damageType : Text
      , amount :
          { kind : Text
          , axis : Text
          , base : { dice : Natural, dieSize : Natural }
          , perLevel : { dice : Natural }
          , startingAtLevel : Natural
          }
      }

let OperationEffect =
      { kind : Text
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional SaveDamage
      , onSuccess : Optional { kind : Text }
      , distanceFeet : Optional Natural
      , direction : Optional Text
      }

let defaultOperationEffect : OperationEffect =
      { kind = ""
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None SaveDamage
      , onSuccess = None { kind : Text }
      , distanceFeet = None Natural
      , direction = None Text
      }

let Operation =
      { trigger : { kind : Text }
      , usageLimit : Optional { kind : Text, limitGroup : Optional Text }
      , effect : OperationEffect
      }

let defaultOperation : Operation =
      { trigger = { kind = "" }
      , usageLimit = None { kind : Text, limitGroup : Optional Text }
      , effect = defaultOperationEffect
      }

let sharedSaveLimit =
      { kind = "once_per_turn"
      , limitGroup = Some "cloudkill_save_per_turn"
      }

let cloudkill =
      { kind = "spell"
      , id = "cloudkill"
      , name = "Cloudkill"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Cloudkill"
          }

      , mechanics =
          { family = "ongoing_effect"
          , level = 5
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              , earlyEnd = [ { kind = "area_dispersed_by_strong_wind" } ]
              }
          , attachment =
              { kind = "hole"
              , holeId = "cloudkill_point"
              , label = "spell origin point"
              , value =
                  { kind = "area"
                  , shape = { kind = "sphere", radiusFeet = 20 }
                  , origin = { kind = "point_within_range" }
                  }
              }
          , initialPhase =
              { kind = "save_gate"
              , attachment =
                  { kind = "hole"
                  , holeId = "cloudkill_point"
                  , label = "spell origin point"
                  , value =
                      { kind = "area"
                      , shape = { kind = "sphere", radiusFeet = 20 }
                      , origin = { kind = "point_within_range" }
                      }
                  }
              , ability = "con"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail =
                  { kind = "damage"
                  , damageType = "poison"
                  , amount =
                      { kind = "linear_per_level"
                      , axis = "slot"
                      , base = { dice = 5, dieSize = 8 }
                      , perLevel = { dice = 1 }
                      , startingAtLevel = 5
                      }
                  }
              , onSuccess = { kind = "half_damage" }
              , usageLimit = sharedSaveLimit
              }
          , operations =
              [ defaultOperation // { trigger = { kind = "passive" }
                , effect = defaultOperationEffect // { kind = "area_is_heavily_obscured" }
                }
              , defaultOperation // { trigger = { kind = "on_caster_turn_start" }
                , effect =
                    defaultOperationEffect
                      //  { kind = "move_area"
                          , distanceFeet = Some 10
                          , direction = Some "away_from_caster"
                          }
                }
              , defaultOperation // { trigger = { kind = "on_area_moves_into_creature_space" }
                , usageLimit = Some sharedSaveLimit
                , effect =
                    defaultOperationEffect // { kind = "save_gate"
                    , ability = Some "con"
                    , dc = Some { kind = "caster_spell_save_dc" }
                    , onFail = Some
                        { kind = "damage"
                        , damageType = "poison"
                        , amount =
                            { kind = "linear_per_level"
                            , axis = "slot"
                            , base = { dice = 5, dieSize = 8 }
                            , perLevel = { dice = 1 }
                            , startingAtLevel = 5
                            }
                        }
                    , onSuccess = Some { kind = "half_damage" }
                    }
                }
              , defaultOperation // { trigger = { kind = "on_creature_enters_area" }
                , usageLimit = Some sharedSaveLimit
                , effect =
                    defaultOperationEffect // { kind = "save_gate"
                    , ability = Some "con"
                    , dc = Some { kind = "caster_spell_save_dc" }
                    , onFail = Some
                        { kind = "damage"
                        , damageType = "poison"
                        , amount =
                            { kind = "linear_per_level"
                            , axis = "slot"
                            , base = { dice = 5, dieSize = 8 }
                            , perLevel = { dice = 1 }
                            , startingAtLevel = 5
                            }
                        }
                    , onSuccess = Some { kind = "half_damage" }
                    }
                }
              , defaultOperation // { trigger = { kind = "on_creature_ends_turn_in_area" }
                , usageLimit = Some sharedSaveLimit
                , effect =
                    defaultOperationEffect // { kind = "save_gate"
                    , ability = Some "con"
                    , dc = Some { kind = "caster_spell_save_dc" }
                    , onFail = Some
                        { kind = "damage"
                        , damageType = "poison"
                        , amount =
                            { kind = "linear_per_level"
                            , axis = "slot"
                            , base = { dice = 5, dieSize = 8 }
                            , perLevel = { dice = 1 }
                            , startingAtLevel = 5
                            }
                        }
                    , onSuccess = Some { kind = "half_damage" }
                    }
                }
              ]
          }
      }

in  cloudkill
