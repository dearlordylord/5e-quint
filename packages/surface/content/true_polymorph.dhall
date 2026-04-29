-- True Polymorph — SRD 5.2.1 Spell, Level 9, Transmutation.
-- §C4d + §C4h validation ref. Creature-into-creature branch
-- authored with willing/unwilling save gate (`saveAppliesIf` =
-- unwilling_target) and `permanentIfMaintainedFull` concentration
-- promotion.
--
-- PARTIAL.
--   • Object-into-creature and creature-into-object branches
--     deferred pending §C4g (object-target transform). Current
--     encoding covers creature→creature only.
--   • "The creature is Friendly to you and your allies" (object-
--     into-creature): allegiance is DM agenda.
--   • "If the spell lasts more than an hour, you no longer control"
--     — time-gated control loss, narrative.
--   • "Gear melds into the new form" — narrative.

let truePolymorph =
      { kind = "spell"
      , id = "true_polymorph"
      , name = "True Polymorph"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#True Polymorph"
          }
      , description =
          "Choose one creature or nonmagical object that you can see within range. The creature shape-shifts into a different creature or a nonmagical object, or the object shape-shifts into a creature. The transformation lasts for the duration or until the target dies or is destroyed, but if you maintain Concentration on this spell for the full duration, the spell lasts until dispelled. An unwilling creature can make a Wisdom saving throw, and if it succeeds, it isn't affected by this spell."
      , mechanics =
          { family = "activation"
          , level = 9
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components =
              { v = True
              , s = True
              , m = Some "a drop of mercury, a dollop of gum arabic, and a wisp of smoke"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              , permanentIfMaintainedFull = True
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "true_polymorph_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , saveAppliesIf = "unwilling_target"
                , onFail =
                    { kind = "transform_target"
                    , newForm =
                        { kind = "catalog_ref"
                        , creatureType = "beast"
                        , crBound = { kind = "target_cr_or_level" }
                        }
                    , retainedFields =
                        [ "alignment"
                        , "personality"
                        , "hit_points"
                        , "hit_point_dice"
                        ]
                    , tempHpFromForm = True
                    , actionRestriction = "no_speech_no_spells"
                    , revertTriggers =
                        [ { kind = "temp_hp_depleted" }
                        , { kind = "spell_ends" }
                        , { kind = "zero_hp" }
                        ]
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  truePolymorph
