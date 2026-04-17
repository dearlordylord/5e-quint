-- Mass Suggestion — SRD 5.2.1 Spell, level 6, Enchantment.
--
-- RAW (Spells / Descriptions M-P / Mass Suggestion):
--   "You suggest a course of activity — described in no more than
--    two or three sentences — to one or more creatures you can see
--    within range who can hear and understand you. Creatures that
--    can't be Charmed are immune. The suggestion must sound
--    achievable and not involve anything that would obviously harm
--    the target."
--   "Each target must succeed on a Wisdom saving throw or be Charmed
--    by you for the duration or until you or your allies deal damage
--    to the target. A creature that is Charmed by you in this way
--    pursues the course of activity you described to the best of its
--    ability. If the activity can be completed in a shorter time
--    than the spell's duration, the spell ends when the subject
--    finishes what it was asked to do."
--   "Using a Higher-Level Spell Slot. The duration is longer with a
--    spell slot of level 7 (10 days), 8 (30 days), or 9 (366 days)."
--
-- PARTIAL validation reference. Encodes:
--   • TargetSelection.choose_up_to with fixed numeric count 12
--     (validation reference for the fixed-count branch alongside
--     prayer_of_healing's count = 5).
--   • save_gate.onFail apply_condition charmed.
--   • Duration.timed earlyEnd with target_damaged_by_caster_or_ally
--     (third instance after charm_person / charm_monster — confirms
--     the trigger generalizes across the Charm family).
--   • Base duration 24 hours.
--
-- DEFERRED / omitted:
--   • Slot-scaling on duration changes UNITS across tiers
--     (hours → days): base 24 hours at L6, 10/30/366 DAYS at L7/8/9.
--     DurationUpcastTier.amount is a single number with a shared unit
--     on the parent DurationValue — no cross-unit tier shape. Model
--     only the base 24-hour duration; wait for a second cross-unit
--     scaling unit to coalesce the widening.
--   • "Pursues the course of activity described" — the verbal
--     suggestion and compliance judgment ("must sound achievable",
--     "doesn't obviously harm") are DM agenda (narrative mutation /
--     session-owned compliance, per BATCH_DIGEST_PROMPT.md §DM rules
--     and plans/CONTENT_SURFACE_DEFERRED.md §B Command precedent).
--   • "Creatures that can't be Charmed are immune" — handled by the
--     target's own condition-immunity state at resolution time; not
--     a per-spell filter.
--   • "Who can hear and understand you" is language/comprehension
--     (DM agenda per §B Comprehend Languages / Tongues).
--   • "Spell ends when the subject finishes what it was asked to do"
--     is narrative-completion judgment (DM agenda).

let massSuggestion =
      { kind = "spell"
      , id = "mass_suggestion"
      , name = "Mass Suggestion"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Mass Suggestion"
          }
      , description =
          "You suggest a course of activity — described in no more than two or three sentences — to one or more creatures you can see within range who can hear and understand you. Creatures that can't be Charmed are immune. The suggestion must sound achievable and not involve anything that would obviously harm the target. Each target must succeed on a Wisdom saving throw or be Charmed by you for the duration or until you or your allies deal damage to the target. A creature that is Charmed by you in this way pursues the course of activity you described to the best of its ability. If the activity can be completed in a shorter time than the spell's duration, the spell ends when the subject finishes what it was asked to do. Using a Higher-Level Spell Slot. The duration is longer with a spell slot of level 7 (10 days), 8 (30 days), or 9 (366 days)."
      , mechanics =
          { family = "activation"
          , level = 6
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True
              , s = False
              , m = Some "a snake's tongue and a honeycomb or a drop of sweet oil"
              }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 24 }
              , earlyEnd =
                  [ { kind = "target_damaged_by_caster_or_ally" } ]
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "target"
                    , selection =
                        { mode = "choose_up_to"
                        , count = 12
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition = "charmed"
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  massSuggestion
