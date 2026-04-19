-- Animal Shapes — SRD 5.2.1 Spell, Level 8, Transmutation (Druid).
--
-- RAW (Spells/Descriptions-A-D#Animal Shapes):
--   Choose any number of willing creatures within range. Each target
--   shape-shifts into a Large or smaller Beast of your choice that has
--   a Challenge Rating of 4 or lower. You can choose a different form
--   for each target. On later turns, you can take a Magic action to
--   transform the targets again.
--
--   A target retains its creature type; Hit Points; Hit Point Dice;
--   alignment; ability to communicate; and Intelligence, Wisdom, and
--   Charisma scores. The target's actions are limited by the Beast
--   form's anatomy, and it can't cast spells. Equipment melds into
--   the new form.
--
--   The target gains Temporary Hit Points equal to the HP of the FIRST
--   form into which it shape-shifts. These THP vanish when the spell
--   ends. The transformation lasts until the spell ends OR until the
--   target ends it as a Bonus Action.
--
-- Family: ongoing_effect (24h timed, NO concentration).
-- Attachment: any_number of willing targets.
--
-- PARTIAL ENCODING — surface_widening:
--   Encoded:
--     • initialPhase: direct → transform_target (initial beast form,
--       tempHpFromForm on first transform only).
--     • operations: on_caster_spends_action(magic) → transform_target
--       (re-transform on later turns; tempHpFromForm omitted since THP
--       is only granted from the FIRST form).
--
--   Deferred (surface_widening):
--     1. PolymorphRevertTrigger missing { kind = "target_bonus_action" }.
--        RAW: "until the target ends it as a Bonus Action." The existing
--        revert triggers (spell_ends, zero_hp) are included; the voluntary
--        target Bonus Action revert cannot be expressed.
--     2. PolymorphFormSource missing maxSize field. RAW: "Large or smaller"
--        is a size constraint not expressible on the current source type.
--     3. PolymorphActionRestriction missing "no_spells_only" variant. RAW:
--        target "can't cast spells" BUT retains "ability to communicate."
--        Existing "no_speech_no_spells" is wrong (suppresses communication).
--        actionRestriction is omitted to avoid a dishonest trace.
--     4. tempHpFromForm semantics: only granted on the FIRST transform.
--        The re-transform operation omits tempHpFromForm; the initial
--        phase includes it. The surface does not distinguish first vs
--        subsequent transforms for the same target.
--     5. "ability to communicate" mapped to "languages" (closest available
--        PolymorphRetainedField). The SRD's "ability to communicate" is
--        broader than language-knowledge.

let animalShapes =
      { kind = "spell"
      , id = "animal_shapes"
      , name = "Animal Shapes"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Animal Shapes"
          }
      , description =
          "Choose any number of willing creatures that you can see within range. Each target shape-shifts into a Large or smaller Beast of your choice that has a Challenge Rating of 4 or lower. You can choose a different form for each target. On later turns, you can take a Magic action to transform the targets again. A target's game statistics are replaced by the chosen Beast's statistics, but the target retains its creature type; Hit Points; Hit Point Dice; alignment; ability to communicate; and Intelligence, Wisdom, and Charisma scores. The target's actions are limited by the Beast form's anatomy, and it can't cast spells. The target's equipment melds into the new form. The target gains a number of Temporary Hit Points equal to the Hit Points of the first form into which it shape-shifts. These Temporary Hit Points vanish if any remain when the spell ends. The transformation lasts for the duration or until the target ends it as a Bonus Action."
      , mechanics =
          { family = "ongoing_effect"
          , level = 8
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "timed", value = { unit = "hour", amount = 24 } }
          , attachment =
              { kind = "target"
              , selection = { mode = "any_number" }
              }
          , initialPhase =
              { kind = "direct"
              , attachment =
                  { kind = "target"
                  , selection = { mode = "any_number" }
                  }
              , effects =
                  [ { kind = "transform_target"
                    , newForm =
                        { kind = "catalog_ref"
                        , creatureType = "beast"
                        , crBound = { kind = "fixed", cr = 4 }
                        }
                    , retainedFields =
                        [ "creature_type"
                        , "hit_points"
                        , "hit_point_dice"
                        , "alignment"
                        , "languages"
                        , "intelligence"
                        , "wisdom"
                        , "charisma"
                        ]
                    , tempHpFromForm = True
                    , revertTriggers =
                        [ { kind = "spell_ends" }
                        , { kind = "zero_hp" }
                        ]
                    }
                  ]
              }
          , operations =
              [ { trigger =
                      { kind = "on_caster_spends_action"
                      , cost =
                          { kind = "standard_action"
                          , action = "magic"
                          }
                      }
                , effect =
                    { kind = "transform_target"
                    , newForm =
                        { kind = "catalog_ref"
                        , creatureType = "beast"
                        , crBound = { kind = "fixed", cr = 4 }
                        }
                    , retainedFields =
                        [ "creature_type"
                        , "hit_points"
                        , "hit_point_dice"
                        , "alignment"
                        , "languages"
                        , "intelligence"
                        , "wisdom"
                        , "charisma"
                        ]
                    , revertTriggers =
                        [ { kind = "spell_ends" }
                        , { kind = "zero_hp" }
                        ]
                    }
                }
              ]
          }
      }

in  animalShapes
