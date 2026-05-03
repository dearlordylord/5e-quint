-- Reckless Attack — SRD 5.2.1 Barbarian level 2.
-- Chosen when making the first attack roll on the Barbarian's turn.
-- Grants Advantage on Strength attack rolls and grants Advantage to attacks against the Barbarian
-- until the start of the Barbarian's next turn.

let Effect =
      { kind : Text
      , mode : Text
      , affects : Text
      , on : List Text
      , abilityFilter : Optional (List Text)
      }

let selfAdvantage =
      { kind = "modify_roll_advantage"
      , mode = "advantage"
      , affects = "self_roll"
      , on = [ "attack_roll" ]
      , abilityFilter = Some [ "str" ]
      } : Effect

let incomingAdvantage =
      { kind = "modify_roll_advantage"
      , mode = "advantage"
      , affects = "rolls_against_self"
      , on = [ "attack_roll" ]
      , abilityFilter = None (List Text)
      } : Effect

let recklessAttack =
      { kind = "class_feature"
      , id = "barbarian_reckless_attack"
      , name = "Reckless Attack"
      , className = "barbarian"
      , acquiredAtLevel = 2
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Barbarian#Reckless Attack"
          }
      , description =
          "Attack recklessly to gain Advantage on Strength attack rolls while attacks against you also have Advantage."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "free" }
          , usageLimit = { kind = "once_per_turn" }
          , ongoingFeature =
              { activationTiming = "first_attack_roll"
              , lifecycle =
                  { kind = "turn_boundary"
                  , initialExpiration = "start_of_next_turn"
                  , earlyEndConditions = [] : List Text
                  , earlyEndArmorCategories = [] : List Text
                  }
              , actionRestrictions = [] : List Text
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ selfAdvantage, incomingAdvantage ]
                }
              ]
          }
      }

in  recklessAttack
