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
--   * the Surface records the strong-wind Line, initial and end-turn
--     Strength save push, directional Movement cost, and Bonus Action
--     direction change;
--   * battle-runtime support remains blocked on persistent self-origin
--     Line area identity, repeated area-save/force-move execution,
--     directional Movement cost witnesses, and gas/flame presentation
--     ownership.

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
      { kind : Text, cost : Optional ActionCost }

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
      { kind = "passive", cost = None ActionCost }

let endTurnInAreaTrigger : Trigger =
      { kind = "on_creature_ends_turn_in_area", cost = None ActionCost }

let bonusActionTrigger : Trigger =
      { kind = "on_caster_spends_action"
      , cost = Some { kind = "bonus_action" }
      }

let gustOfWind =
      { kind = "spell"
      , id = "gust_of_wind"
      , name = "Gust of Wind"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Gust of Wind"
          }
      , description =
          "A Line of strong wind 60 feet long and 10 feet wide blasts from you in a direction you choose for the duration. Each creature in the Line must succeed on a Strength saving throw or be pushed 15 feet away from you in a direction following the Line. A creature that ends its turn in the Line must make the same save. Any creature in the Line must spend 2 feet of movement for every 1 foot it moves when moving closer to you. The gust disperses gas or vapor, extinguishes candles and similar unprotected flames, causes protected flames to dance wildly, and has a 50 percent chance to extinguish protected flames. As a Bonus Action on your later turns, you can change the direction in which the Line blasts from you."
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
