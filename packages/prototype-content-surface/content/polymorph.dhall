-- Polymorph — SRD 5.2.1 Spell, Level 4, Transmutation.
-- §C4d validation ref — transform_target EffectAtom + polymorph
-- retained-fields + temp-HP-from-new-form.
--
-- Phase: save_gate (Wis save). On fail, transform to a Beast with
-- CR ≤ target's CR-or-level. Retains alignment, personality, creature
-- type, HP, HD. Gains Temp HP = new form HP; spell ends when Temp HP
-- depletes.
--
-- "Gear melds into the new form" and "can't speak or cast spells" —
-- the latter encoded via actionRestriction = "no_speech_no_spells";
-- the gear-meld is narrative/DM.

let polymorph =
      { kind = "spell"
      , id = "polymorph"
      , name = "Polymorph"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Polymorph"
          }
      , description =
          "You attempt to transform a creature that you can see within range into a Beast. The target must succeed on a Wisdom saving throw or shape-shift into a Beast form for the duration. That form can be any Beast with CR ≤ the target's (or the target's level if it doesn't have a CR). The target's stats are replaced by the chosen Beast but retains its alignment, personality, creature type, Hit Points, and Hit Point Dice. The target gains Temp HP equal to the Beast form's HP; spell ends if Temp HP depletes."
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = Some "a caterpillar cocoon" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "hole"
                    , holeId = "polymorph_target"
                    , label = "target"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
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
                        , "creature_type"
                        , "hit_points"
                        , "hit_point_dice"
                        ]
                    , tempHpFromForm = True
                    , actionRestriction = "no_speech_no_spells"
                    , revertTriggers =
                        [ { kind = "temp_hp_depleted" }
                        , { kind = "spell_ends" }
                        ]
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  polymorph
