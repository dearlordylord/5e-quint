-- Telepathic Bond - SRD 5.2.1 Spell, level 5, Divination.

let telepathicBond =
      { kind = "spell"
      , id = "telepathic_bond"
      , name = "Telepathic Bond"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Telepathic Bond"
          }

      , mechanics =
          { family = "activation"
          , level = 5
          , school = "divination"
          , castingTime = { kind = "action", ritual = True }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = "two eggs" }
          , duration = { kind = "timed", value = { unit = "hour", amount = 1 } }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "telepathic_bond_targets"
                    , label = "up to eight willing creatures"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count = 8
                            , targetKinds = [ "creature" ]
                            , disposition = "willing"
                            }
                        }
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  telepathicBond
