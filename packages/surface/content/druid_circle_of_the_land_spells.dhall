-- Circle of the Land Spells (Druid L3) — SRD 5.2.1 Druid subclass feature.
--
-- RAW (Classes / Druid / Circle of the Land / Level 3: Circle Spells):
--   After a Long Rest, choose Arid, Polar, Temperate, or Tropical.
--   You always have the spells prepared in the Circle Spells table for
--   your Druid level and lower.
--
-- This record preserves the class-feature identity. The selected land
-- state and derived spell access are intentionally deferred to a
-- character-sheet follow-up so the Long Rest choice is not collapsed into
-- fixed grants.

let circleOfTheLandSpells =
      { kind = "class_feature"
      , id = "druid_circle_of_the_land_spells"
      , name = "Circle Spells"
      , className = "druid"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Druid#Circle Spells"
          }
      , description =
          "Whenever you finish a Long Rest, choose one type of land: Arid, Polar, Temperate, or Tropical. You always have the spells prepared that are listed in the Circle Spells table for your Druid level and lower."
      , mechanics =
          { family = "passive"
          , grants = [] : List {}
          }
      }

in  circleOfTheLandSpells
