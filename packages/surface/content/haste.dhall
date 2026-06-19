-- Haste — SRD 5.2.1 Spell, level 3, Transmutation.
--
-- RAW (Spells / Descriptions E-L / Haste):
--   "Choose a willing creature that you can see within range. Until
--    the spell ends, the target's Speed is doubled, it gains a +2
--    bonus to Armor Class, it has Advantage on Dexterity saving throws,
--    and it gains an additional action on each of its turns. That action
--    can be used to take only the Attack (one attack only), Dash,
--    Disengage, Hide, or Utilize action."
--   "When the spell ends, the target is Incapacitated and has a Speed
--    of 0 until the end of its next turn, as a wave of lethargy washes
--    over it."
--
-- The additional action is modeled as an allow-list, not the Action Surge
-- exclusion shape. The Attack branch has its own one-attack limit so runtime
-- support can distinguish spending the Attack action from attacks made by it.
-- Lethargy is a spell-end target state rider with separate Incapacitated and
-- Speed 0 effects; Incapacitated is not treated as an implicit Speed change.

let AttackLimit : Type = { kind : Text, count : Natural }

let AllowedAction : Type =
      { action : Text, attackLimit : Optional AttackLimit }

let ActionRestriction : Type =
      { kind : Text, actions : List AllowedAction }

let DiceDelta : Type =
      { kind : Text
      , amount : Optional Natural
      , dice : Optional Natural
      , dieSize : Optional Natural
      , sign : Text
      }

let SpeedEffect : Type = { kind : Text, feet : Natural }

let Effect : Type =
      { kind : Text
      , numerator : Optional Natural
      , denominator : Optional Natural
      , delta : Optional DiceDelta
      , mode : Optional Text
      , on : Optional (List Text)
      , saveAbilityFilter : Optional (List Text)
      , restriction : Optional ActionRestriction
      , duration : Optional Text
      , condition : Optional Text
      , speed : Optional SpeedEffect
      }

let noAttackLimit = None AttackLimit

let unrestrictedAction =
        \(action : Text) ->
          { action, attackLimit = noAttackLimit }

let hasteActionRestriction : ActionRestriction =
      { kind = "allow_only"
      , actions =
          [ { action = "attack"
            , attackLimit = Some { kind = "attack_count", count = 1 }
            }
          , unrestrictedAction "dash"
          , unrestrictedAction "disengage"
          , unrestrictedAction "hide"
          , unrestrictedAction "utilize"
          ]
      }

let fixedNumberPlus2 : DiceDelta =
      { kind = "fixed_number"
      , amount = Some 2
      , dice = None Natural
      , dieSize = None Natural
      , sign = "+"
      }

let noDelta = None DiceDelta

let noTexts = None (List Text)

let noRestriction = None ActionRestriction

let noDuration = None Text

let noSpeed = None SpeedEffect

let emptyEffect : Effect =
      { kind = ""
      , numerator = None Natural
      , denominator = None Natural
      , delta = noDelta
      , mode = None Text
      , on = noTexts
      , saveAbilityFilter = noTexts
      , restriction = noRestriction
      , duration = noDuration
      , condition = None Text
      , speed = noSpeed
      }

let doubledSpeed : Effect =
      emptyEffect
        //  { kind = "set_speed_ratio"
            , numerator = Some 2
            , denominator = Some 1
            }

let armorClassBonus : Effect =
      emptyEffect // { kind = "modify_ac", delta = Some fixedNumberPlus2 }

let dexteritySaveAdvantage : Effect =
      emptyEffect
        //  { kind = "modify_roll_advantage"
            , mode = Some "advantage"
            , on = Some [ "saving_throw" ]
            , saveAbilityFilter = Some [ "dex" ]
            }

let restrictedAdditionalAction : Effect =
      emptyEffect
        //  { kind = "grant_extra_action"
            , restriction = Some hasteActionRestriction
            }

let lethargyOnEffectEnd : Effect =
      emptyEffect
        //  { kind = "effect_end_target_state"
            , duration = Some "end_of_target_next_turn"
            , condition = Some "incapacitated"
            , speed = Some { kind = "set_speed", feet = 0 }
            }

let haste =
      { kind = "spell"
      , id = "haste"
      , name = "Haste"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Haste"
          }
      , description =
          "Choose a willing creature that you can see within range. Until the spell ends, the target's Speed is doubled, it gains a +2 bonus to Armor Class, it has Advantage on Dexterity saving throws, and it gains an additional action on each of its turns. That action can be used to take only the Attack (one attack only), Dash, Disengage, Hide, or Utilize action. When the spell ends, the target is Incapacitated and has a Speed of 0 until the end of its next turn, as a wave of lethargy washes over it."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components =
              { v = True
              , s = True
              , m = Some "a shaving of licorice root"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "haste_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , targetKinds = [ "creature" ]
                            , disposition = "willing"
                            , visibility = "caster_can_see"
                            }
                        }
                    }
                , effects =
                    [ doubledSpeed
                    , armorClassBonus
                    , dexteritySaveAdvantage
                    , restrictedAdditionalAction
                    , lethargyOnEffectEnd
                    ] : List Effect
                }
              ]
          }
      }

in  haste
