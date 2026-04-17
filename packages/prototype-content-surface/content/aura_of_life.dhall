-- Aura of Life — SRD 5.2.1 Spell, level 4, Abjuration.
--
-- RAW (Spells / Descriptions A-D / Aura of Life):
--   "An aura radiates from you in a 30-foot Emanation for the
--    duration. While in the aura, you and your allies have Resistance
--    to Necrotic damage, and your Hit Point maximums can't be reduced.
--    If an ally with 0 Hit Points starts its turn in the aura, that
--    ally regains 1 Hit Point."
--
-- PARTIAL. Encoded:
--   • Area emanation 30 ft from self.
--   • grant_resistance "necrotic" as the area's persistent effect.
--
-- DEFERRED.
--   • "Hit Point maximums can't be reduced" — there is no atom for
--     "block max-HP reduction" (modify_max_hp is an additive delta, not
--     an immunity gate). Needs a new atom; sibling case to Mind Blank
--     damage-immunity gap.
--   • "If an ally with 0 Hit Points starts its turn in the aura,
--    regains 1 HP" — conditional per-turn heal with an HP-threshold
--    predicate. Sibling case to Heroism's per-turn temp-HP refresh
--    and Beacon of Hope's maximize-healing rider. Needs a new
--    ongoing-op shape (per-turn-trigger conditional atom).
--   • Ally-vs-enemy discrimination on the resistance and heal ("you
--    and your allies") is allegiance (DM agenda per
--    plans/CONTENT_SURFACE_DEFERRED.md §B); the authored shape
--    applies the resistance inside the emanation without narrowing
--    the target set, matching other emanation authoring.

let auraOfLife =
      { kind = "spell"
      , id = "aura_of_life"
      , name = "Aura of Life"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Aura of Life"
          }
      , description =
          "An aura radiates from you in a 30-foot Emanation for the duration. While in the aura, you and your allies have Resistance to Necrotic damage, and your Hit Point maximums can't be reduced. If an ally with 0 Hit Points starts its turn in the aura, that ally regains 1 Hit Point."
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = False, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "area"
                    , shape =
                        { kind = "emanation", radiusFeet = 30 }
                    , origin = { kind = "self" }
                    }
                , effects =
                    [ { kind = "grant_resistance"
                      , damageType = "necrotic"
                      }
                    ]
                }
              ]
          }
      }

in  auraOfLife
