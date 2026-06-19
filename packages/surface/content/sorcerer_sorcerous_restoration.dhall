-- Sorcerous Restoration - SRD 5.2.1 Sorcerer level 5.
--
-- This feature does not define a second Sorcery Point pool. It restores
-- expended points from the existing Font of Magic point-pool resource when a
-- Short Rest finishes, up to half Sorcerer level rounded down, once per Long
-- Rest.

let sorcerousRestoration =
      { acquiredAtLevel = 5
      , className = "sorcerer"
      , description =
          "SRD Sorcerer level 5 Sorcerous Restoration source facts. When a Sorcerer finishes a Short Rest, they can regain expended Sorcery Points from the existing Font of Magic pool, up to half Sorcerer level rounded down, and can't use this feature again until finishing a Long Rest."
      , id = "sorcerer_sorcerous_restoration"
      , kind = "class_feature"
      , mechanics =
          { family = "sorcery_point_short_rest_recovery"
          , recoveryTrigger = "short_rest"
          , resource =
              { kind = "point_pool"
              , resourceUnitId = "sorcerer_font_of_magic"
              }
          , recoveryCap = { kind = "half_class_level_rounded_down" }
          , resetCadence = { kind = "long_rest" }
          }
      , name = "Sorcerous Restoration"
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Sorcerer.md:127-129" }
      }

in  sorcerousRestoration
