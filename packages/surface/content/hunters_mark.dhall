-- Hunter's Mark — SRD 5.2.1 Spell, level 1, Divination.
--
-- RAW: mark one creature; +1d6 Force damage on attack-roll hits
-- against it. If target drops to 0 HP, Bonus Action to move the mark
-- to a new creature.
--
-- Consolidated validation reference for:
--   • DurationValue.upcastTiers (new widening — the concentration
--     upper bound scales by slot: up to 1 hour at slot 1-2, 8 hours
--     at slot 3-4, 24 hours at slot 5+. First unit with slot-scaled
--     duration; coalescing earlier gap.)
--
-- The finding rider is represented as a passive operation with the canonical
-- Wisdom/Perception-or-Survival scope.

let DiceAmount : Type =
      { kind : Text, expr : Optional { dice : Natural, dieSize : Natural } }

let SkillFilter : Type =
      { kind : Text, skills : List Text }

let Effect : Type =
      { kind : Text
      , damageType : Optional Text
      , amount : Optional DiceAmount
      , mode : Optional Text
      , affects : Optional Text
      , on : Optional (List Text)
      , abilityFilter : Optional (List Text)
      , skillFilter : Optional SkillFilter
      }

let damageEffect : Effect =
      { kind = "damage"
      , damageType = Some "force"
      , amount =
          Some
            { kind = "fixed"
            , expr = Some { dice = 1, dieSize = 6 }
            }
      , mode = None Text
      , affects = None Text
      , on = None (List Text)
      , abilityFilter = None (List Text)
      , skillFilter = None SkillFilter
      }

let findingEffect : Effect =
      { kind = "modify_roll_advantage"
      , damageType = None Text
      , amount = None DiceAmount
      , mode = Some "advantage"
      , affects = Some "self_roll"
      , on = Some [ "ability_check" ]
      , abilityFilter = Some [ "wis" ]
      , skillFilter =
          Some
            { kind = "fixed"
            , skills = [ "perception", "survival" ]
            }
      }

let huntersMark =
      { kind = "spell"
      , id = "hunters_mark"
      , name = "Hunter's Mark"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L.md#Hunter's Mark"
          }

      , mechanics =
          { family = "ongoing_effect"
          , level = 1
          , school = "divination"
          , castingTime = { kind = "bonus_action" }
          , range = { kind = "point", feet = 90 }
          , components = { v = True, s = False, m = False }
          , duration =
              { kind = "concentration"
              , upTo =
                  { unit = "hour"
                  , amount = 1
                  , upcastTiers =
                      [ { atSlot = 3, amount = 8 }
                      , { atSlot = 5, amount = 24 }
                      ]
                  }
              }
          , attachment =
              { kind = "hole"
              , holeId = "hunters_mark_mark"
              , label = "mark target"
              , value =
                  { kind = "mark"
                  , selection = { mode = "one", targetKinds = [ "creature" ] }
                  , transfer =
                      Some
                        { onEvent = { kind = "target_drops_to_0_hp" }
                        , availability = { kind = "after_trigger" }
                        , cost = { kind = "bonus_action" }
                        }
                  }
              }
          , operations =
              [ { trigger = { kind = "on_caster_attack_hit" }
                , effect = damageEffect
                }
              , { trigger = { kind = "passive" }
                , effect = findingEffect
                }
              ]
          }
      }

in  huntersMark
