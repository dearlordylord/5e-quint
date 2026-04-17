-- Mind Blank — SRD 5.2.1 Spell, level 8, Abjuration.
--
-- RAW (Spells / Descriptions M-P / Mind Blank):
--   "Until the spell ends, one willing creature you touch has Immunity
--    to Psychic damage and the Charmed condition. The target is also
--    unaffected by anything that would sense its emotions or alignment,
--    read its thoughts, or magically detect its location, and no spell
--    — not even Wish — can gather information about the target,
--    observe it remotely, or control its mind."
--
-- PARTIAL. Encoded:
--   • grant_condition_immunity "charmed" for 24 hours (timed).
--
-- DEFERRED.
--   • Psychic damage immunity — no damage-immunity atom on the
--     surface. grant_resistance is resistance (half damage), not
--     immunity (zero damage). Needs a new atom (e.g.,
--     grant_damage_immunity { damageType }). Motivating units: Mind
--     Blank; likely future Holy Aura, many monster stat-block traits.
--     Add to DEFERRED §A.
--   • "Sense emotions / alignment / read thoughts / magically detect
--     location / gather information / observe remotely / control its
--     mind" — all DM-agenda per ARCHITECTURE.md §1 (narrative
--     mutation, remote sensing, allegiance/alignment, location
--     sensing). Per plans/CONTENT_SURFACE_DEFERRED.md §B class.

let mindBlank =
      { kind = "spell"
      , id = "mind_blank"
      , name = "Mind Blank"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Mind Blank"
          }
      , description =
          "Until the spell ends, one willing creature you touch has Immunity to Psychic damage and the Charmed condition. The target is also unaffected by anything that would sense its emotions or alignment, read its thoughts, or magically detect its location, and no spell — not even Wish — can gather information about the target, observe it remotely, or control its mind."
      , mechanics =
          { family = "activation"
          , level = 8
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 24 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , effects =
                    [ { kind = "grant_condition_immunity"
                      , condition = "charmed"
                      }
                    ]
                }
              ]
          }
      }

in  mindBlank
