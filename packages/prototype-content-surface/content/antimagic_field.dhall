-- Antimagic Field — SRD 5.2.1 Spell, level 8, Abjuration.
--
-- RAW (Spells/Descriptions-A-D#Antimagic Field):
--   "No one can cast spells, take Magic actions, or create other
--    magical effects inside the aura, and those things can't target or
--    otherwise affect anything inside it."
--   "Magical properties of magic items don't work inside the aura or on
--    anything inside it."
--   "Areas of effect created by spells or other magic can't extend into
--    the aura, and no one can teleport into or out of it or use planar
--    travel there."
--   "Ongoing spells, except those cast by an Artifact or a deity, are
--    suppressed in the area. While an effect is suppressed, it doesn't
--    function, but the time it spends suppressed counts against its
--    duration."
--
-- PARTIAL: temporary portal closure and "Dispel Magic has no effect"
-- are not represented as executable surface facts yet.

let Effect : Type =
      { kind : Text
      , exceptSources : Optional (List Text)
      , suppressedTimeCountsAgainstDuration : Optional Bool
      }

let plain =
      \(kind : Text) ->
        { kind
        , exceptSources = None (List Text)
        , suppressedTimeCountsAgainstDuration = None Bool
        }

let suppressOngoing : Effect =
      { kind = "suppress_ongoing_magic_effects"
      , exceptSources = Some [ "artifact", "deity" ]
      , suppressedTimeCountsAgainstDuration = Some True
      }

let antimagicField =
      { kind = "spell"
      , id = "antimagic_field"
      , name = "Antimagic Field"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Antimagic Field"
          }
      , description =
          "An aura of antimagic surrounds you in a 10-foot Emanation. No one can cast spells, take Magic actions, or create other magical effects inside the aura, and those things can't target or otherwise affect anything inside it. Magical properties of magic items don't work inside the aura or on anything inside it. Areas of effect created by spells or other magic can't extend into the aura, and no one can teleport into or out of it or use planar travel there. Ongoing spells, except those cast by an Artifact or a deity, are suppressed in the area, and suppressed time counts against duration."
      , mechanics =
          { family = "ongoing_effect"
          , level = 8
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = Some "iron filings" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , attachment =
              { kind = "area"
              , shape = { kind = "emanation", radiusFeet = 10 }
              , origin = { kind = "self" }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect = plain "prevent_spellcasting_and_magic_actions"
                }
              , { trigger = { kind = "passive" }
                , effect = plain "block_magical_targeting_and_aoe"
                }
              , { trigger = { kind = "passive" }
                , effect = plain "block_teleport_and_planar_travel"
                }
              , { trigger = { kind = "passive" }
                , effect = plain "suppress_magic_items"
                }
              , { trigger = { kind = "passive" }
                , effect = suppressOngoing
                }
              ]
          }
      }

in  antimagicField
