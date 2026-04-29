-- Clairvoyance — SRD 5.2.1 spell.
--
-- RAW (Spells/Descriptions-A-D#Clairvoyance):
--   "You create an Invisible sensor within range in a location familiar
--    to you ... or in an obvious location that is unfamiliar to you..."
--   "When you cast the spell, choose seeing or hearing. You can use the
--    chosen sense through the sensor as if you were in its space. As a
--    Bonus Action, you can switch between seeing and hearing."

let Effect
    : Type
    = { kind : Text
      , visibility : Optional Text
      , durability : Optional Text
      , senses : Optional (List Text)
      , switchCost : Optional Text
      }

let createSensor
    : Effect
    = { kind = "create_sensor"
      , visibility = Some "invisible"
      , durability = Some "invulnerable"
      , senses = None (List Text)
      , switchCost = None Text
      }

let remotePerception
    : Effect
    = { kind = "remote_perception"
      , visibility = None Text
      , durability = None Text
      , senses = Some [ "seeing", "hearing" ]
      , switchCost = Some "bonus_action"
      }

let clairvoyance =
      { kind = "spell"
      , id = "clairvoyance"
      , name = "Clairvoyance"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Clairvoyance"
          }
      , description =
          "You create an Invisible sensor within range in a location familiar to you or in an obvious location that is unfamiliar to you. The intangible, invulnerable sensor remains in place for the duration. When you cast the spell, choose seeing or hearing. You can use the chosen sense through the sensor as if you were in its space. As a Bonus Action, you can switch between seeing and hearing."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "divination"
          , castingTime = { kind = "minutes", amount = 10, ritual = False }
          , range = { kind = "point", feet = 5280 }
          , components =
              { v = True
              , s = True
              , m =
                  Some
                    "a focus worth 100+ GP, either a jeweled horn for hearing or a glass eye for seeing"
              , materialCostGp = 100
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "clairvoyance_sensor_location"
                    , label = "sensor location"
                    , value =
                        { kind = "location"
                        , description = "familiar or obvious location"
                        }
                    }
                , effects = [ createSensor, remotePerception ]
                }
              ]
          }
      }

in  clairvoyance
