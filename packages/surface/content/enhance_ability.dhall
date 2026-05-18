-- Enhance Ability — SRD 5.2.1 Spell, level 2, Transmutation.
--
-- RAW (Spells / Descriptions E-L / Enhance Ability):
--   "You touch a creature and choose Strength, Dexterity, Intelligence,
--    Wisdom, or Charisma. For the duration, the target has Advantage on
--    ability checks using the chosen ability."
--   "Using a Higher-Level Spell Slot. You can target one additional creature
--    for each spell slot level above 2. You can choose a different ability for
--    each target."
--
-- Encoding decisions:
--   * SRD 5.2.1 does not include Constitution or the older named mode effects.
--   * The Surface records full target-count scaling; runtime projection may
--     support a narrower profile until per-target ability choices are modeled.

let AbilityChoice : Type =
      { kind : Text, label : Text, options : List Text }

let AbilityFilter : Type =
      { kind : Text
      , holeId : Text
      , label : Optional Text
      , value : AbilityChoice
      }

let enhanceAbility =
      { kind = "spell"
      , id = "enhance_ability"
      , name = "Enhance Ability"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Enhance Ability"
          }
      , description =
          "You touch a creature and choose Strength, Dexterity, Intelligence, Wisdom, or Charisma. For the duration, the target has Advantage on ability checks using the chosen ability. Using a Higher-Level Spell Slot. You can target one additional creature for each spell slot level above 2. You can choose a different ability for each target."
      , mechanics =
          { family = "ongoing_effect"
          , level = 2
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "fur or a feather"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "enhance_ability_target"
              , label = "target"
              , value =
                  { kind = "target"
                  , selection =
                      { mode = "choose_up_to"
                      , count =
                          { kind = "linear"
                          , base = 1
                          , perSlotAboveBase = 1
                          , baseLevel = 2
                          }
                      , targetKinds = [ "creature" ]
                      }
                  }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "modify_roll_advantage"
                    , mode = "advantage"
                    , affects = "self_roll"
                    , on = [ "ability_check" ]
                    , abilityFilter =
                        { kind = "hole"
                        , holeId = "enhance_ability_chosen_ability"
                        , label = Some "chosen ability"
                        , value =
                            { kind = "choice"
                            , label = "chosen ability"
                            , options = [ "str", "dex", "int", "wis", "cha" ]
                            }
                        } : AbilityFilter
                    }
                }
              ]
          }
      }

in  enhanceAbility
