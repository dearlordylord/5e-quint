-- Bestow Curse - SRD 5.2.1 Spell, level 3, Necromancy.
--
-- RAW (Spells/Descriptions-A-D#Bestow Curse):
--   "You touch a creature, which must succeed on a Wisdom saving throw or
--    become cursed for the duration."
--   "Until the curse ends, the target suffers one of the following effects of
--    your choice:"
--      1. chosen-ability Ability Check and Saving Throw Disadvantage
--      2. Attack Roll Disadvantage against the caster
--      3. start-of-turn Wisdom Saving Throw or forced Dodge
--      4. extra 1d8 Necrotic damage from caster attack-roll or spell damage
--   "Using a Higher-Level Spell Slot" changes both duration and
--    Concentration: level 4 keeps Concentration for 10 minutes, level 5+
--    removes Concentration, level 5-6 lasts 8 hours, level 7-8 lasts 24
--    hours, and level 9 lasts until dispelled.
--
-- The curse is modeled as a typed curse occurrence rather than spell-id
-- dispatch. Its removal boundary is the shared "all curses affecting target
-- end" fact consumed by curse-ending effects such as Remove Curse.

let DurationValue : Type = { unit : Text, amount : Natural }

let TierDuration : Type =
      { kind : Text
      , upTo : Optional DurationValue
      , value : Optional DurationValue
      , endsOn : Optional (List Text)
      }

let concentrationMinute : Natural -> TierDuration =
      \(amount : Natural) ->
        { kind = "concentration"
        , upTo = Some { unit = "minute", amount }
        , value = None DurationValue
        , endsOn = None (List Text)
        }

let timedHour : Natural -> TierDuration =
      \(amount : Natural) ->
        { kind = "timed"
        , upTo = None DurationValue
        , value = Some { unit = "hour", amount }
        , endsOn = None (List Text)
        }

let untilDispelled : TierDuration =
      { kind = "permanent"
      , upTo = None DurationValue
      , value = None DurationValue
      , endsOn = Some [ "dispel" ]
      }

let DiceAmount : Type =
      { kind : Text, expr : Optional { dice : Natural, dieSize : Natural } }

let necroticD8 : DiceAmount =
      { kind = "fixed", expr = Some { dice = 1, dieSize = 8 } }

let AbilityChoice : Type =
      { kind : Text, label : Text, options : List Text }

let AbilityFilter : Type =
      { kind : Text
      , holeId : Text
      , label : Optional Text
      , value : Optional AbilityChoice
      }

let cursedAbilityChoice : AbilityChoice =
      { kind = "choice"
      , label = "cursed ability"
      , options = [ "str", "dex", "con", "int", "wis", "cha" ]
      }

let cursedAbilityFilter : AbilityFilter =
      { kind = "hole"
      , holeId = "bestow_curse_ability"
      , label = Some "cursed ability"
      , value = Some cursedAbilityChoice
      }

let sameCursedAbilityFilter : AbilityFilter =
      { kind = "same_choice_as"
      , holeId = "bestow_curse_ability"
      , label = None Text
      , value = None AbilityChoice
      }

let DcSource : Type = { kind : Text }

let casterSpellSaveDc : DcSource = { kind = "caster_spell_save_dc" }

let BasicEffect : Type =
      { kind : Text, action : Optional Text, cost : Optional Text }

let noEffect : BasicEffect =
      { kind = "none", action = None Text, cost = None Text }

let forcedDodge : BasicEffect =
      { kind = "take_standard_action"
      , action = Some "dodge"
      , cost = Some "included_in_effect"
      }

let CurseOptionEffect : Type =
      { kind : Text
      , mode : Optional Text
      , affects : Optional Text
      , on : Optional (List Text)
      , abilityFilter : Optional AbilityFilter
      , saveAbilityFilter : Optional AbilityFilter
      , attackRollTarget : Optional Text
      , ability : Optional Text
      , dc : Optional DcSource
      , onFail : Optional BasicEffect
      , onSuccess : Optional BasicEffect
      , damageType : Optional Text
      , amount : Optional DiceAmount
      }

let emptyCurseOptionEffect : CurseOptionEffect =
      { kind = ""
      , mode = None Text
      , affects = None Text
      , on = None (List Text)
      , abilityFilter = None AbilityFilter
      , saveAbilityFilter = None AbilityFilter
      , attackRollTarget = None Text
      , ability = None Text
      , dc = None DcSource
      , onFail = None BasicEffect
      , onSuccess = None BasicEffect
      , damageType = None Text
      , amount = None DiceAmount
      }

let chosenAbilityDisadvantage : CurseOptionEffect =
      emptyCurseOptionEffect
    // { kind = "modify_roll_advantage"
       , mode = Some "disadvantage"
       , affects = Some "self_roll"
       , on = Some [ "ability_check", "saving_throw" ]
       , abilityFilter = Some cursedAbilityFilter
       , saveAbilityFilter = Some sameCursedAbilityFilter
       }

let attackRollAgainstCasterDisadvantage : CurseOptionEffect =
      emptyCurseOptionEffect
    // { kind = "modify_roll_advantage"
       , mode = Some "disadvantage"
       , affects = Some "self_roll"
       , on = Some [ "attack_roll" ]
       , attackRollTarget = Some "caster"
       }

let turnStartWisdomSaveOrDodge : CurseOptionEffect =
      emptyCurseOptionEffect
    // { kind = "save_gate"
       , ability = Some "wis"
       , dc = Some casterSpellSaveDc
       , onFail = Some forcedDodge
       , onSuccess = Some noEffect
       }

let necroticDamageRider : CurseOptionEffect =
      emptyCurseOptionEffect
    // { kind = "damage"
       , damageType = Some "necrotic"
       , amount = Some necroticD8
       }

let Trigger : Type = { kind : Text, damageSource : Optional (List Text) }

let passiveTrigger : Trigger =
      { kind = "passive", damageSource = None (List Text) }

let attachedTurnStartTrigger : Trigger =
      { kind = "on_attached_turn_start", damageSource = None (List Text) }

let casterDamageTrigger : Trigger =
      { kind = "on_caster_deals_damage_to_attachment"
      , damageSource = Some [ "attack_roll", "spell" ]
      }

let Operation : Type = { trigger : Trigger, effect : CurseOptionEffect }

let CurseOption : Type =
      { id : Text, displayName : Text, operations : List Operation }

let curseOption =
      \(id : Text) ->
      \(displayName : Text) ->
      \(trigger : Trigger) ->
      \(effect : CurseOptionEffect) ->
        { id
        , displayName
        , operations = [ { trigger, effect } ]
        }

let CurseRemoval : Type = { kind : Text, target : Text }

let CurseOccurrence : Type =
      { kind : Text, removal : CurseRemoval, options : List CurseOption }

let bestowCurseOccurrence : CurseOccurrence =
      { kind = "curse_occurrence"
      , removal =
          { kind = "all_curses_affecting_target_end"
          , target = "attached_target"
          }
      , options =
          [ curseOption
              "chosen_ability_disadvantage"
              "Chosen ability checks and saving throws"
              passiveTrigger
              chosenAbilityDisadvantage
          , curseOption
              "caster_targeted_attack_disadvantage"
              "Attack rolls against caster"
              passiveTrigger
              attackRollAgainstCasterDisadvantage
          , curseOption
              "turn_start_wisdom_save_or_dodge"
              "Start-of-turn Wisdom save or Dodge"
              attachedTurnStartTrigger
              turnStartWisdomSaveOrDodge
          , curseOption
              "caster_damage_necrotic_rider"
              "Caster attack-roll or spell damage rider"
              casterDamageTrigger
              necroticDamageRider
          ]
      }

let bestowCurse =
      { kind = "spell"
      , id = "bestow_curse"
      , name = "Bestow Curse"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Bestow Curse"
          }
      , description =
          "You touch a creature, which must succeed on a Wisdom saving throw or become cursed for the duration. Until the curse ends, the target suffers one of four effects of your choice: chosen-ability Disadvantage on ability checks and saving throws, Disadvantage on attack rolls against you, a start-of-turn Wisdom saving throw or forced Dodge, or extra Necrotic damage when you damage it with an attack roll or a spell. Using a Higher-Level Spell Slot. Level 4 lasts up to 10 minutes with Concentration. Level 5+ does not require Concentration: level 5-6 lasts 8 hours, level 7-8 lasts 24 hours, and level 9 lasts until dispelled."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "slot_tiered"
              , base =
                  { kind = "concentration"
                  , upTo = { unit = "minute", amount = 1 }
                  }
              , tiers =
                  [ { atSlot = 4
                    , duration = concentrationMinute 10
                    }
                  , { atSlot = 5
                    , duration = timedHour 8
                    }
                  , { atSlot = 7
                    , duration = timedHour 24
                    }
                  , { atSlot = 9
                    , duration = untilDispelled
                    }
                  ]
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "bestow_curse_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , targetKinds = [ "creature" ]
                            }
                        }
                    }
                , ability = "wis"
                , dc = casterSpellSaveDc
                , onFail = bestowCurseOccurrence
                , onSuccess = noEffect
                }
              ]
          }
      }

in  bestowCurse
