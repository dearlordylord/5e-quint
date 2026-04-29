-- Tsunami — SRD 5.2.1 Spell, level 8, Conjuration.
--
-- RAW (Spells/Descriptions-S-Z#Tsunami):
--   "A wall of water springs into existence at a point you choose within
--    range. You can make the wall up to 300 feet long, 300 feet high,
--    and 50 feet thick."
--   "When the wall appears, each creature in its area makes a Strength
--    saving throw, taking 6d10 Bludgeoning damage on a failed save or
--    half as much damage on a successful one."
--   "At the start of each of your turns after the wall appears, the wall,
--    along with any creatures in it, moves 50 feet away from you."
--   "Any Huge or smaller creature inside the wall or whose space the wall
--    enters when it moves must succeed on a Strength saving throw or
--    take 5d10 Bludgeoning damage. A creature can take this damage only
--    once per round."
--   "At the end of the turn, the wall's height is reduced by 1d10. When
--    the wall reaches 0 feet in height, the spell ends."
--   "A creature caught in the wall can move by swimming... must succeed
--    on a Strength (Athletics) check against your spell save DC to move
--    at all... A creature that moves out of the wall falls to the ground."
--
-- PARTIAL: the Huge-or-smaller restriction is attached to the
-- wall-enters-space trigger. The same restriction for creatures already
-- inside the wall awaits a generic target-size predicate for area
-- occupants.

let DiceAmount : Type =
      { kind : Text
      , expr :
          { dice : Natural, dieSize : Natural, flat : Optional Natural }
      }

let Dc : Type = { kind : Text }

let Outcome : Type =
      { kind : Text
      , amount : Optional DiceAmount
      , damageType : Optional Text
      }

let noneOutcome : Outcome =
      { kind = "none", amount = None DiceAmount, damageType = None Text }

let halfDamage : Outcome = noneOutcome // { kind = "half_damage" }

let initialDamage : Outcome =
      noneOutcome
        //  { kind = "damage"
            , amount =
                Some
                  { kind = "fixed"
                  , expr = { dice = 6, dieSize = 10, flat = None Natural }
                  }
            , damageType = Some "bludgeoning"
            }

let movingWallDamage : Outcome =
      initialDamage
        //  { amount =
                Some
                  { kind = "fixed"
                  , expr = { dice = 5, dieSize = 10, flat = None Natural }
                  }
            }

let Effect : Type =
      { kind : Text
      , amount : Optional DiceAmount
      , damageType : Optional Text
      , distanceFeet : Optional Natural
      , direction : Optional Text
      , includeCreaturesInArea : Optional Bool
      , ability : Optional Text
      , skill : Optional Text
      , dc : Optional Dc
      , onFail : Optional Outcome
      , onSuccess : Optional Outcome
      , onFailure : Optional Text
      }

let noneEffect =
      { amount = None DiceAmount
      , damageType = None Text
      , distanceFeet = None Natural
      , direction = None Text
      , includeCreaturesInArea = None Bool
      , ability = None Text
      , skill = None Text
      , dc = None Dc
      , onFail = None Outcome
      , onSuccess = None Outcome
      , onFailure = None Text
      }

let initialSave : Effect =
      noneEffect
        //  { kind = "save_gate"
            , ability = Some "str"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail = Some initialDamage
            , onSuccess = Some halfDamage
            }

let moveWall : Effect =
      noneEffect
        //  { kind = "move_area"
            , distanceFeet = Some 50
            , direction = Some "away_from_caster"
            , includeCreaturesInArea = Some True
            }

let movingWallSave : Effect =
      noneEffect
        //  { kind = "save_gate"
            , ability = Some "str"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFail = Some movingWallDamage
            , onSuccess = Some noneOutcome
            }

let reduceHeight : Effect =
      noneEffect
        //  { kind = "reduce_area_height"
            , amount =
                Some
                  { kind = "fixed"
                  , expr = { dice = 1, dieSize = 10, flat = None Natural }
                  }
            }

let endAtZero : Effect =
      noneEffect // { kind = "end_current_effect_at_area_height_zero" }

let swimCheck : Effect =
      noneEffect
        //  { kind = "ability_check_to_move_in_area"
            , ability = Some "str"
            , skill = Some "athletics"
            , dc = Some { kind = "caster_spell_save_dc" }
            , onFailure = Some "cannot_move"
            }

let fallToGround : Effect = noneEffect // { kind = "fall_to_ground" }

let tsunamiWall =
      { kind = "hole"
      , holeId = "tsunami_wall"
      , label = "wall of water"
      , value =
          { kind = "area"
          , shape =
              { kind = "wall_volume"
              , maxLengthFeet = 300
              , maxHeightFeet = 300
              , thicknessFeet = 50
              }
          , origin = { kind = "point_within_range" }
          }
      }

let Trigger : Type =
      { kind : Text, maxCreatureSize : Optional Text }

let casterTurnStart : Trigger =
      { kind = "on_caster_turn_start", maxCreatureSize = None Text }

let casterTurnEnd : Trigger =
      { kind = "on_caster_turn_end", maxCreatureSize = None Text }

let passive : Trigger =
      { kind = "passive", maxCreatureSize = None Text }

let areaMovesIntoHugeOrSmaller : Trigger =
      { kind = "on_area_moves_into_creature_space"
      , maxCreatureSize = Some "huge"
      }

let exitsArea : Trigger =
      { kind = "on_creature_exits_area", maxCreatureSize = None Text }

let Operation : Type =
      { trigger : Trigger
      , effect : Effect
      , usageLimit : Optional { kind : Text }
      }

let oncePerRound = { kind = "once_per_round" }

let tsunami =
      { kind = "spell"
      , id = "tsunami"
      , name = "Tsunami"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Tsunami"
          }
      , description =
          "A wall of water springs into existence at a point within range, up to 300 feet long, 300 feet high, and 50 feet thick. When the wall appears, creatures in it make a Strength saving throw, taking 6d10 Bludgeoning damage on a failed save or half as much on a success. At the start of each of your turns, the wall and creatures in it move 50 feet away from you. Huge or smaller creatures inside the wall or whose spaces it enters save or take 5d10 Bludgeoning damage, only once per round. At the end of the turn, the wall height is reduced by 1d10, and the spell ends at 0 feet. Creatures caught in the wall must succeed on a Strength (Athletics) check against your spell save DC to move at all, and a creature that moves out falls to the ground."
      , mechanics =
          { family = "ongoing_effect"
          , level = 8
          , school = "conjuration"
          , castingTime = { kind = "minutes", amount = 1, ritual = False }
          , range = { kind = "point", feet = 5280 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "round", amount = 6 }
              }
          , attachment = tsunamiWall
          , initialPhase =
              initialSave
                //  { attachment = tsunamiWall }
          , operations =
              [ { trigger = casterTurnStart
                , effect = moveWall
                , usageLimit = None { kind : Text }
                }
              , { trigger = casterTurnStart
                , effect = movingWallSave
                , usageLimit = Some oncePerRound
                }
              , { trigger = areaMovesIntoHugeOrSmaller
                , effect = movingWallSave
                , usageLimit = Some oncePerRound
                }
              , { trigger = casterTurnEnd
                , effect = reduceHeight
                , usageLimit = None { kind : Text }
                }
              , { trigger = passive
                , effect = endAtZero
                , usageLimit = None { kind : Text }
                }
              , { trigger = passive
                , effect = swimCheck
                , usageLimit = None { kind : Text }
                }
              , { trigger = exitsArea
                , effect = fallToGround
                , usageLimit = None { kind : Text }
                }
              ] : List Operation
          }
      }

in  tsunami
