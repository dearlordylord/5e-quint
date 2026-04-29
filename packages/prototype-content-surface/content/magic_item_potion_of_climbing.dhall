-- Potion of Climbing — SRD 5.2.1 magic item.
--
-- RAW (MagicItems#PotionOfClimbing):
--   "When you drink this potion, you gain a Climb Speed equal to your
--    Speed for 1 hour. During this time, you have Advantage on Strength
--    (Athletics) checks to climb."

let Effect
    : Type
    = { kind : Text
      , speedKind : Optional Text
      , feet : Optional { kind : Text }
      , mode : Optional Text
      , on : Optional (List Text)
      , skillFilter : Optional { kind : Text, skills : List Text }
      }

let climbSpeed
    : Effect
    = { kind = "grant_speed"
      , speedKind = Some "climb"
      , feet = Some { kind = "walk_speed" }
      , mode = None Text
      , on = None (List Text)
      , skillFilter = None { kind : Text, skills : List Text }
      }

let climbCheckAdvantage
    : Effect
    = { kind = "modify_roll_advantage"
      , speedKind = None Text
      , feet = None { kind : Text }
      , mode = Some "advantage"
      , on = Some [ "ability_check" ]
      , skillFilter = Some { kind = "fixed", skills = [ "athletics" ] }
      }

let potion =
      { kind = "magic_item"
      , id = "magic_item_potion_of_climbing"
      , name = "Potion of Climbing"
      , rarity = "common"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#PotionOfClimbing"
          }
      , description =
          "When you drink this potion, you gain a Climb Speed equal to your Speed for 1 hour. During this time, you have Advantage on Strength (Athletics) checks to climb."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "standard_action", action = "magic" }
          , resource =
              { kind = "use_count"
              , cap = { kind = "fixed", uses = 1 }
              }
          , resetCadence = { kind = "never" }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ climbSpeed, climbCheckAdvantage ]
                }
              ]
          }
      , destruction = { kind = "permanent_on_empty" }
      }

in  potion
