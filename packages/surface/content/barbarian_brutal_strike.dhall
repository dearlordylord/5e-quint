-- Brutal Strike — SRD 5.2.1 Barbarian level 9.
--
-- RAW (Classes / Barbarian / Level 9: Brutal Strike):
--   If you use Reckless Attack, you can forgo Advantage on one eligible
--   Strength-based attack roll on your turn. On a hit, the target takes
--   an extra 1d10 damage of the same type dealt by the weapon or
--   Unarmed Strike, and you choose one Brutal Strike effect: Forceful
--   Blow or Hamstring Blow.

let BrutalStrikeOption : Type =
      { id : Text
      , target : { kind : Text }
      , forcedMovement :
          Optional { kind : Text, feet : Natural, direction : Text }
      , selfMovement :
          Optional
            { kind : Text
            , distance : { kind : Text }
            , opportunityAttacks : Text
            }
      , speedPenalty :
          Optional { feet : Natural, until : Text, stacking : Text }
      }

let brutalStrike =
      { kind = "class_feature"
      , id = "barbarian_brutal_strike"
      , name = "Brutal Strike"
      , className = "barbarian"
      , acquiredAtLevel = 9
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Barbarian.md:128-134" }

      , mechanics =
          { family = "brutal_strike"
          , trigger =
              { kind = "reckless_attack_strength_attack_hit"
              , prerequisiteUnitId = "barbarian_reckless_attack"
              , timing = "on_your_turn"
              , advantageForgone = True
              , attackMustNotHaveDisadvantage = True
              }
          , damage =
              { kind = "add_attack_damage_dice"
              , dice = { dice = 1, dieSize = 10 }
              , damageType = "same_as_attack"
              }
          , optionChoice = { kind = "choose_one", maxOptions = 1 }
          , options =
              [ { id = "forceful_blow"
                , target = { kind = "hit_target" }
                , forcedMovement =
                    Some
                      { kind = "push"
                      , feet = 15
                      , direction = "straight_away_from_you"
                      }
                , selfMovement =
                    Some
                      { kind = "move_toward_target"
                      , distance = { kind = "half_speed" }
                      , opportunityAttacks = "does_not_provoke"
                      }
                , speedPenalty =
                    None { feet : Natural, until : Text, stacking : Text }
                }
              , { id = "hamstring_blow"
                , target = { kind = "hit_target" }
                , forcedMovement =
                    None { kind : Text, feet : Natural, direction : Text }
                , selfMovement =
                    None
                      { kind : Text
                      , distance : { kind : Text }
                      , opportunityAttacks : Text
                      }
                , speedPenalty =
                    Some
                      { feet = 15
                      , until = "start_of_your_next_turn"
                      , stacking = "most_recent_only"
                      }
                }
              ] : List BrutalStrikeOption
          }
      }

in  brutalStrike
