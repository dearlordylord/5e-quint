-- Potion of Clairvoyance — SRD 5.2.1 magic item.
--
-- RAW (MagicItems#PotionOfClairvoyance):
--   "When you drink this potion, you gain the effect of the
--    Clairvoyance spell (no Concentration required)."
--
-- Encoded directly rather than as a spell reference so the no-
-- concentration override is explicit in the item surface.

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

let potion =
      { kind = "magic_item"
      , id = "magic_item_potion_of_clairvoyance"
      , name = "Potion of Clairvoyance"
      , rarity = "rare"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#PotionOfClairvoyance"
          }
      , description =
          "When you drink this potion, you gain the effect of the Clairvoyance spell (no Concentration required)."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "standard_action", action = "magic" }
          , range = { kind = "point", feet = 5280 }
          , resource =
              { kind = "use_count"
              , cap = { kind = "fixed", uses = 1 }
              }
          , resetCadence = { kind = "never" }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "magic_item_potion_of_clairvoyance_sensor_location"
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
      , destruction = { kind = "permanent_on_empty" }
      }

in  potion
