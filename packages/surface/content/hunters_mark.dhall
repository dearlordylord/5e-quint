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
-- DEFERRED. "You also have Advantage on any Wisdom (Perception or
-- Survival) check you make to find it" — requires both an
-- OngoingOperation array (the `operation` field is currently
-- singular) and a skill-scoped roll-advantage shape. Two widenings
-- for one rider is more than one tick can justify; deferred.

let huntersMark =
      { kind = "spell"
      , id = "hunters_mark"
      , name = "Hunter's Mark"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-G-P#Hunter's Mark"
          }
      , description =
          "You magically mark one creature you can see within range as your quarry. Until the spell ends, you deal an extra 1d6 Force damage to the target whenever you hit it with an attack roll. You also have Advantage on any Wisdom (Perception or Survival) check you make to find it. If the target drops to 0 Hit Points before this spell ends, you can take a Bonus Action to move the mark to a new creature you can see within range."
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
                  , selection = { mode = "one" }
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
                , effect =
                    { kind = "damage"
                    , damageType = "force"
                    , amount =
                        { kind = "fixed"
                        , expr = { dice = 1, dieSize = 6 }
                        }
                    }
                }
              ]
          }
      }

in  huntersMark
