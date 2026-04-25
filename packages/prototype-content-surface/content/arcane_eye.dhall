-- Arcane Eye — SRD 5.2.1 spell.
--
-- RAW (Spells/Descriptions-A-D#ArcaneEye):
--   "You create an Invisible, invulnerable eye within range that hovers
--    for the duration. You mentally receive visual information from the
--    eye, which can see in every direction. It also has Darkvision with
--    a range of 30 feet."
--   "As a Bonus Action, you can move the eye up to 30 feet in any
--    direction."

let arcaneEye =
      let Trigger : Type =
            { kind : Text
            , cost : Optional { kind : Text }
            }

      let passiveTrigger : Trigger =
            { kind = "passive"
            , cost = None { kind : Text }
            }

      let bonusActionTrigger : Trigger =
            { kind = "on_caster_spends_action"
            , cost = Some { kind = "bonus_action" }
            }

      let Sense : Type = { kind : Text, rangeFeet : Natural }

      let Effect : Type =
            { kind : Text
            , visibility : Optional Text
            , durability : Optional Text
            , sensorSenses : Optional (List Sense)
            , senses : Optional (List Text)
            , maxMoveFeet : Optional Natural
            }

      let createSensor : Effect =
            { kind = "create_sensor"
            , visibility = Some "invisible"
            , durability = Some "invulnerable"
            , sensorSenses = Some [ { kind = "darkvision", rangeFeet = 30 } ]
            , senses = None (List Text)
            , maxMoveFeet = None Natural
            }

      let remotePerception : Effect =
            { kind = "remote_perception"
            , visibility = None Text
            , durability = None Text
            , sensorSenses = None (List Sense)
            , senses = Some [ "seeing" ]
            , maxMoveFeet = None Natural
            }

      let repositionEye : Effect =
            { kind = "reposition_attachment"
            , visibility = None Text
            , durability = None Text
            , sensorSenses = None (List Sense)
            , senses = None (List Text)
            , maxMoveFeet = Some 30
            }

      let Operation : Type = { trigger : Trigger, effect : Effect }

      in  { kind = "spell"
          , id = "arcane_eye"
          , name = "Arcane Eye"
          , provenance =
              { kind = "srd-5.2.1"
              , section = "Spells/Descriptions-A-D#Arcane Eye"
              }
          , description =
              "You create an Invisible, invulnerable eye within range that hovers for the duration. You mentally receive visual information from the eye, which can see in every direction. It also has Darkvision with a range of 30 feet. As a Bonus Action, you can move the eye up to 30 feet in any direction."
          , mechanics =
              { family = "ongoing_effect"
              , level = 4
              , school = "divination"
              , castingTime = { kind = "action" }
              , range = { kind = "point", feet = 30 }
              , components =
                  { v = True
                  , s = True
                  , m = Some "a bit of bat fur"
                  }
              , duration =
                  { kind = "concentration"
                  , upTo = { unit = "hour", amount = 1 }
                  }
              , attachment =
                  { kind = "hole"
                  , holeId = "arcane_eye_location"
                  , label = "eye location"
                  , value =
                      { kind = "location"
                      , description = "point within range"
                      }
                  }
              , operations =
                  ( [ { trigger = passiveTrigger, effect = createSensor }
                    , { trigger = passiveTrigger, effect = remotePerception }
                    , { trigger = bonusActionTrigger, effect = repositionEye }
                    ]
                    : List Operation
                  )
              }
          }

in  arcaneEye
