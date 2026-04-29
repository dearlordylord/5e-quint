-- Extra Attack — SRD 5.2.1 Paladin level 5.
--
-- RAW (Classes / Paladin / Level 5: Extra Attack):
--   "You can attack twice instead of once whenever you take the Attack
--    action on your turn."
--
-- Consolidated validation reference for:
--   • ClassFeatureMechanics.passive (always-on, no resource, no reset)
--   • scale_attack_count effect atom (+1 weapon attack per Attack
--     action — not a second Action)
--
-- The Paladin, Fighter, Ranger, and Barbarian classes all receive
-- Extra Attack at level 5 with the same "twice instead of once"
-- phrasing; Fighter later scales to 3 and 4 attacks at higher levels
-- (modeled as a scale_attack_count with a larger `additional` value or
-- a per-level scaling axis — deferred until a second feature of that
-- shape surfaces).

let extraAttack =
      { kind = "class_feature"
      , id = "paladin_extra_attack"
      , name = "Extra Attack"
      , className = "paladin"
      , acquiredAtLevel = 5
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Paladin#Extra Attack"
          }
      , description =
          "You can attack twice instead of once whenever you take the Attack action on your turn."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "scale_attack_count", additional = 1 } ]
          }
      }

in  extraAttack
