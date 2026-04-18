-- Minor Illusion — SRD 5.2.1 Spell, level 0 (cantrip), Illusion.
--
-- RAW (Spells / Descriptions M-R / Minor Illusion):
--   "You create a sound or an image of an object within range that
--    lasts for the duration. The illusion ends if you cast this spell
--    again."
--   "Sound: its volume can range from a whisper to a scream. The
--    sound continues unabated throughout the duration, or you can
--    make discrete sounds at different times."
--   "Image: must be no larger than a 5-foot Cube. The image can't
--    create sound, light, smell, or any other sensory effect."
--   "Study check: Intelligence (Investigation) vs spell save DC to
--    discern the illusion."
--
-- Encoding decisions:
--   • Family: activation (illusion created once, persists via timed
--     duration — no ongoing triggers).
--   • Cast-time choice (Sound vs Image) encodes as CastTimeEffectModeChoice
--     on the direct phase's `mode` field.
--   • create_illusion atom: channels=["sound"] for Sound (maxSize "tiny"
--     — RAW gives no spatial bound for sound, "tiny" is conservatively
--     smallest); channels=["visual"] for Image (maxSize "small" = 5-ft
--     cube per SRD).
--   • Attachment: area/cube/5ft at point_within_range — exact for Image,
--     approximate for Sound (sound has no cubic spatial bound in RAW;
--     the create_illusion atom's channels/maxSize carry the authoritative
--     constraints). This is an inherent limitation of the shared attachment
--     vocabulary — sound placement is a point, not a cube.
--   • earlyEnd: caster_recasts_spell per RAW ("the illusion ends if you
--     cast this spell again").
--   • Investigation disbelief check: per create_illusion atom docs,
--     "Investigation-vs-spell-DC disbelief... belong to separate
--     surfaces" — cleanly excluded.

let minorIllusion =
      { kind = "spell"
      , id = "minor_illusion"
      , name = "Minor Illusion"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-R#Minor Illusion"
          }
      , description =
          "You create a sound or an image of an object within range that lasts for the duration. The illusion ends if you cast this spell again. If a creature takes a Study action to examine the sound or image, the creature can determine that it is an illusion with a successful Intelligence (Investigation) check against your spell save DC. If a creature discerns the illusion for what it is, the illusion becomes faint to the creature."
      , mechanics =
          { family = "activation"
          , level = 0
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = False, s = True, m = Some "a bit of fleece" }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 1 }
              , earlyEnd = [ { kind = "caster_recasts_spell" } ]
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "area"
                    , shape = { kind = "cube", sideFeet = 5 }
                    , origin = { kind = "point_within_range" }
                    }
                , mode =
                    { label = "Illusion Type"
                    , options =
                        [ { id = "sound"
                          , displayName = "Sound"
                          , effects =
                              [ { kind = "create_illusion"
                                , maxSize = "tiny"
                                , channels = [ "sound" ]
                                }
                              ]
                          }
                        , { id = "image"
                          , displayName = "Image"
                          , effects =
                              [ { kind = "create_illusion"
                                , maxSize = "small"
                                , channels = [ "visual" ]
                                }
                              ]
                          }
                        ]
                    }
                }
              ]
          }
      }

in  minorIllusion
