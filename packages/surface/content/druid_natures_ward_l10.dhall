-- Nature's Ward — SRD 5.2.1 Druid (Circle of the Land) level 10.
--
-- RAW (Classes/Druid/Circle of the Land#Nature's Ward):
--   "You are immune to the Poisoned condition, and you have Resistance
--    to a damage type associated with your current land choice in the
--    Circle Spells feature, as shown in the Nature's Ward table."
--
--   Nature's Ward table:
--     Arid     → Fire resistance
--     Polar    → Cold resistance
--     Temperate → Lightning resistance
--     Tropical  → Poison resistance
--
-- PARTIAL. Encoded:
--   • grant_condition_immunity "poisoned" — clean.
--
-- DEFERRED / SURFACE WIDENING:
--   • grant_resistance keyed to land type — requires a new variant of
--     DamageTypeRef to express "damage type determined by a
--     character-state variable (the druid's current land choice)".
--     CastTimeChoice<DamageType> is WRONG here: the resistance is not
--     freely chosen from the options list at cast/build time — it is
--     CONSTRAINED to match whichever land type is currently active for
--     the Circle of the Land subclass.
--     Proposed new variant:
--       { kind: "subclass_state_table"; key: string; table: Record<string, DamageType> }
--     See proposal-druid_natures_ward_l10.md.

let naturesWard =
      { kind = "class_feature"
      , id = "druid_natures_ward_l10"
      , name = "Nature's Ward"
      , className = "druid"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Druid#Nature's Ward"
          }
      , description =
          "You are immune to the Poisoned condition, and you have Resistance to a damage type associated with your current land choice in the Circle Spells feature, as shown in the Nature's Ward table. Arid: Fire. Polar: Cold. Temperate: Lightning. Tropical: Poison."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_condition_immunity"
                , condition = "poisoned"
                }
              ]
          }
      }

in  naturesWard
