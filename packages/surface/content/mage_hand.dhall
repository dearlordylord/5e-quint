-- Mage Hand - SRD 5.2.1 Spell, Conjuration Cantrip.
--
-- RAW (Spells/Descriptions-M-P#Mage Hand): a spectral hand appears within
-- 30 feet for 1 minute and can manipulate an eligible object. The hand's
-- repeated Magic Action manipulation remains deferred.

let mageHand =
      { kind = "spell"
      , id = "mage_hand"
      , name = "Mage Hand"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Mage Hand"
          }
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "timed", value = { unit = "minute", amount = 1 } }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "location"
                    , description = "a point you choose within range"
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  mageHand
