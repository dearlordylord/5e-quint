-- Telepathic Bond - SRD 5.2.1 Spell, level 5, Divination.

let telepathicBond =
      { kind = "spell"
      , id = "telepathic_bond"
      , name = "Telepathic Bond"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Telepathic Bond"
          }
      , description =
          "You forge a telepathic link among up to eight willing creatures of your choice within range, psychically linking each to all the others for the duration. Creatures that can't communicate in any languages aren't affected. Until the spell ends, the targets can communicate telepathically through the bond whether or not they share a language. The communication works over any distance but doesn't extend to other planes."
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
