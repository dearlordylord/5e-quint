let bless =
      { kind = "spell"
      , id = "bless"
      , name = "Bless"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Bless"
          }

      , mechanics =
          { family = "ongoing_effect"
          , level = 1
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = Some "a Holy Symbol worth 5+ GP" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment =
              { kind = "hole"
              , holeId = "bless_target"
              , label = "target"
              , value =
                  { kind = "target"
                  , selection =
                      { mode = "choose_up_to"
                      , count =
                          { kind = "linear"
                          , base = 3
                          , perSlotAboveBase = 1
                          , baseLevel = 1
                          }
                      , targetKinds = [ "creature" ]
                      }
                  }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "modify_roll_numeric"
                    , on = [ "attack_roll", "saving_throw" ]
                    , delta =
                        { kind = "fixed_dice"
                        , dice = 1
                        , dieSize = 4
                        , sign = "+"
                        }
                    }
                }
              ]
          }
      }

in  bless
