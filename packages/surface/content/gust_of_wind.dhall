-- Gust of Wind - SRD 5.2.1 Spell, level 2, Evocation.
--
-- RAW (Spells/Descriptions-E-L#Gust of Wind):
--   "A Line of strong wind 60 feet long and 10 feet wide blasts from
--    you in a direction you choose for the duration."
--   "Each creature in the Line must succeed on a Strength saving throw
--    or be pushed 15 feet away from you in a direction following the
--    Line. A creature that ends its turn in the Line must make the same
--    save."
--   "Any creature in the Line must spend 2 feet of movement for every
--    1 foot it moves when moving closer to you."
--   "The gust disperses gas or vapor" and affects candles and flames.
--   "As a Bonus Action on your later turns, you can change the direction
--    in which the Line blasts from you."
--
-- Runtime profile boundary:
--   * the self-origin Line, initial and end-turn Strength saves and push,
--     directional Movement cost, strong-wind fact, and later-turn Bonus Action
--     direction change are statically admitted and executable where the
--     battle runtime owns their behavior;
--   * gas, vapor, and flame interactions remain table-owned and unowned by
--     battle execution.

let Area =
      { kind : Text
      , shape : { kind : Text, lengthFeet : Natural, widthFeet : Natural }
      , origin : { kind : Text }
      }

let LineHole =
      { kind : Text, holeId : Text, label : Text, value : Area }

let ActionCost : Type =
      { kind : Text }

let Trigger : Type =
      { kind : Text
      , cost : Optional ActionCost
      , laterTurnsOnly : Optional Bool
      }

let EffectLeaf : Type =
      { kind : Text
      , movementKind : Optional Text
      , originDirection : Optional Text
      , distanceFeet : Optional Natural
      , multiplier : Optional Natural
      , appliesTo : Optional Text
      }

let Effect : Type =
      { kind : Text
      , attachment : Optional LineHole
      , ability : Optional Text
      , dc : Optional { kind : Text }
      , onFail : Optional EffectLeaf
      , onSuccess : Optional { kind : Text }
      , movementKind : Optional Text
      , originDirection : Optional Text
      , distanceFeet : Optional Natural
      , multiplier : Optional Natural
      , appliesTo : Optional Text
      }

let noneLeaf =
      { kind = "none"
      , movementKind = None Text
      , originDirection = None Text
      , distanceFeet = None Natural
      , multiplier = None Natural
      , appliesTo = None Text
      }

let none =
      { kind = "none"
      , attachment = None LineHole
      , ability = None Text
      , dc = None { kind : Text }
      , onFail = None EffectLeaf
      , onSuccess = None { kind : Text }
      , movementKind = None Text
      , originDirection = None Text
      , distanceFeet = None Natural
      , multiplier = None Natural
      , appliesTo = None Text
      }

let gustLine : LineHole =
      { kind = "hole"
      , holeId = "gust_of_wind_line"
      , label = "gust line"
      , value =
          { kind = "area"
          , shape = { kind = "line", lengthFeet = 60, widthFeet = 10 }
          , origin = { kind = "self" }
          }
      }

let pushAway : EffectLeaf =
      noneLeaf
        //  { kind = "force_move"
            , movementKind = Some "push"
            , originDirection = Some "away_from_caster"
            , distanceFeet = Some 15
            }

let strengthSave : Effect =
      none
        //  { kind = "save_gate"
            , attachment = Some gustLine
            , ability = Some "str"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail = Some pushAway
            , onSuccess = Some { kind = "none" }
            }

let strongWind : Effect =
      none // { kind = "area_has_strong_wind" }

let movementCost : Effect =
      none
        //  { kind = "area_movement_cost_multiplier"
            , multiplier = Some 2
            , appliesTo = Some "toward_source"
            }

let changeDirection : Effect =
      none // { kind = "reposition_attachment" }

let passiveTrigger : Trigger =
      { kind = "passive"
      , cost = None ActionCost
      , laterTurnsOnly = None Bool
      }

let endTurnInAreaTrigger : Trigger =
      { kind = "on_creature_ends_turn_in_area"
      , cost = None ActionCost
      , laterTurnsOnly = None Bool
      }

let bonusActionTrigger : Trigger =
      { kind = "on_caster_spends_action"
      , cost = Some { kind = "bonus_action" }
      , laterTurnsOnly = Some True
      }

let gustOfWind =
      { kind = "spell"
      , id = "gust_of_wind"
      , name = "Gust of Wind"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Gust of Wind"
          }

      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = Some "a legume seed" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment = gustLine
          , initialPhase = strengthSave
          , operations =
              [ { trigger = passiveTrigger, effect = strongWind }
              , { trigger = passiveTrigger, effect = movementCost }
              , { trigger = endTurnInAreaTrigger, effect = strengthSave }
              , { trigger = bonusActionTrigger, effect = changeDirection }
              ]
          }
      }

in  gustOfWind
