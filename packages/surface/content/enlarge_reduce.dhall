-- Enlarge/Reduce - SRD 5.2.1 Spell, level 2, Transmutation.
--
-- RAW (Spells / Descriptions E-L / Enlarge/Reduce):
--   "For the duration, the spell enlarges or reduces a creature or an
--    object you can see within range."
--   "An unwilling creature can make a Constitution saving throw. On a
--    successful save, the spell has no effect."
--   Enlarge changes the target one size category larger, grants Advantage
--   on Strength checks and Strength saving throws, and adds 1d4 damage to
--   attacks with enlarged weapons or Unarmed Strikes.
--   Reduce changes the target one size category smaller, imposes
--   Disadvantage on Strength checks and Strength saving throws, and subtracts
--   1d4 damage from attacks with reduced weapons or Unarmed Strikes, with a
--   minimum damage of 1.
--
-- PARTIAL CREATURE-BRANCH SURFACE RECORD.
--   The object target branch is deliberately not encoded here: Surface target
--   selection cannot represent "object that is neither worn nor carried"
--   together with the creature branch, and promoted runtime has
--   no object-size lifecycle owner. The Unit coverage claim records that as a
--   smaller follow-up split.

let DiceDelta : Type =
      { kind : Text, dice : Natural, dieSize : Natural, sign : Text }

let DamageSourceFilter : Type =
      { kind : Text, attackRollFilter : Text }

let Effect : Type =
      { kind : Text
      , direction : Optional Text
      , steps : Optional Natural
      , mode : Optional Text
      , on : Optional (List Text)
      , abilityFilter : Optional (List Text)
      , saveAbilityFilter : Optional (List Text)
      , delta : Optional DiceDelta
      , damageSourceFilter : Optional DamageSourceFilter
      , minimumDamageTotal : Optional Natural
      }

let baseEffect : Effect =
      { kind = ""
      , direction = None Text
      , steps = None Natural
      , mode = None Text
      , on = None (List Text)
      , abilityFilter = None (List Text)
      , saveAbilityFilter = None (List Text)
      , delta = None DiceDelta
      , damageSourceFilter = None DamageSourceFilter
      , minimumDamageTotal = None Natural
      }

let sizeIncrease : Effect =
      baseEffect
        //  { kind = "modify_size_category"
            , direction = Some "increase"
            , steps = Some 1
            }

let sizeDecrease : Effect =
      baseEffect
        //  { kind = "modify_size_category"
            , direction = Some "decrease"
            , steps = Some 1
            }

let strengthCheckAdvantage : Effect =
      baseEffect
        //  { kind = "modify_roll_advantage"
            , mode = Some "advantage"
            , on = Some [ "ability_check" ]
            , abilityFilter = Some [ "str" ]
            }

let strengthSaveAdvantage : Effect =
      baseEffect
        //  { kind = "modify_roll_advantage"
            , mode = Some "advantage"
            , on = Some [ "saving_throw" ]
            , saveAbilityFilter = Some [ "str" ]
            }

let strengthCheckDisadvantage : Effect =
      strengthCheckAdvantage // { mode = Some "disadvantage" }

let strengthSaveDisadvantage : Effect =
      strengthSaveAdvantage // { mode = Some "disadvantage" }

let attackHitDamageSource : DamageSourceFilter =
      { kind = "attack_hit", attackRollFilter = "weapon_or_unarmed_strike" }

let enlargedAttackDamage : Effect =
      baseEffect
        //  { kind = "modify_damage_numeric"
            , delta =
                Some { kind = "fixed_dice", dice = 1, dieSize = 4, sign = "+" }
            , damageSourceFilter = Some attackHitDamageSource
            }

let reducedAttackDamage : Effect =
      baseEffect
        //  { kind = "modify_damage_numeric"
            , delta =
                Some { kind = "fixed_dice", dice = 1, dieSize = 4, sign = "-" }
            , damageSourceFilter = Some attackHitDamageSource
            , minimumDamageTotal = Some 1
            }

let ModeChoice : Type =
      { kind : Text
      , label : Text
      , options :
          List
            { id : Text
            , displayName : Text
            , effects : List Effect
            }
      }

let enlargeReduceChoice : ModeChoice =
      { kind = "choose_effect_mode"
      , label = "Enlarge/Reduce effect"
      , options =
          [ { id = "enlarge"
            , displayName = "Enlarge"
            , effects =
                [ sizeIncrease
                , strengthCheckAdvantage
                , strengthSaveAdvantage
                , enlargedAttackDamage
                ]
            }
          , { id = "reduce"
            , displayName = "Reduce"
            , effects =
                [ sizeDecrease
                , strengthCheckDisadvantage
                , strengthSaveDisadvantage
                , reducedAttackDamage
                ]
            }
          ]
      }

let enlargeReduce =
      { kind = "spell"
      , id = "enlarge_reduce"
      , name = "Enlarge/Reduce"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Enlarge/Reduce"
          }
      , description =
          "For the duration, the spell enlarges or reduces a creature or an object you can see within range. The object can't be worn or carried. An unwilling creature can make a Constitution saving throw; on a successful save, the spell has no effect. Enlarge increases the target's size by one category, grants Advantage on Strength checks and Strength saving throws, and adds 1d4 damage to attacks with enlarged weapons or Unarmed Strikes. Reduce decreases the target's size by one category, imposes Disadvantage on Strength checks and Strength saving throws, and subtracts 1d4 damage from attacks with reduced weapons or Unarmed Strikes, to a minimum of 1 damage."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components =
              { v = True
              , s = True
              , m = Some "a pinch of powdered iron"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "enlarge_reduce_target"
                    , label = "creature target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one", targetKinds = [ "creature" ] }
                        }
                    }
                , ability = "con"
                , dc = { kind = "caster_spell_save_dc" }
                , saveAppliesIf = "unwilling_target"
                , onFail = enlargeReduceChoice
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  enlargeReduce
