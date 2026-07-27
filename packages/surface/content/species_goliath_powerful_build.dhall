-- Powerful Build (Goliath) — SRD 5.2.1 species trait.
--
-- Honest fit to the current surface:
--   • SpeciesTraitRecord
--   • passive mechanics family
--   • always-on advantage on ability checks made to end the Grappled
--     condition
--
-- Omitted rider (recorded in proposal-species_goliath_powerful_build.md):
--   • "You also count as one size larger when determining your carrying
--     capacity." The surface has no carrying-capacity or effective-size-
--     for-carrying atom, so that half is not authored here.

let grappleEscapeAdvantage =
      { kind = "modify_roll_advantage"
      , mode = "advantage"
      , on = [ "ability_check" ]
      , abilityCheckTrigger =
          { kind = "condition_end"
          , condition = "grappled"
          }
      }

let powerfulBuild =
      { kind = "species_trait"
      , id = "species_goliath_powerful_build"
      , name = "Powerful Build"
      , species = "goliath"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Character-Origins.md:1,67,97,194,213-214"
          }

      , mechanics =
          { family = "passive"
          , grants = [ grappleEscapeAdvantage ]
          }
      }

in  powerfulBuild
