-- Dwarven Resilience (Dwarf) — SRD 5.2.1 species trait.
--
-- Honest fit to the current surface:
--   • SpeciesTraitRecord
--   • passive mechanics family
--   • always-on poison resistance
--   • always-on advantage on saving throws made to avoid or end the
--     Poisoned condition
--
-- The condition-scoped saving-throw rider is directly supported by
-- EffectAtom.modify_roll_advantage with:
--   • on = [ "saving_throw" ]
--   • conditionFilter = [ "poisoned" ]

let PassiveEffect
    : Type
    = { kind : Text
      , damageType : Optional Text
      , mode : Optional Text
      , on : Optional (List Text)
      , conditionFilter : Optional (List Text)
      }

let poisonResistance
    : PassiveEffect
    = { kind = "grant_resistance"
      , damageType = Some "poison"
      , mode = None Text
      , on = None (List Text)
      , conditionFilter = None (List Text)
      }

let poisonedSaveAdvantage
    : PassiveEffect
    = { kind = "modify_roll_advantage"
      , damageType = None Text
      , mode = Some "advantage"
      , on = Some [ "saving_throw" ]
      , conditionFilter = Some [ "poisoned" ]
      }

let dwarvenResilience =
      { kind = "species_trait"
      , id = "dwarf_dwarven_resilience"
      , name = "Dwarven Resilience"
      , species = "dwarf"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Character-Origins/Dwarf#Dwarven Resilience"
          }
      , description =
          "You have Resistance to Poison damage. You also have Advantage on saving throws you make to avoid or end the Poisoned condition."
      , mechanics =
          { family = "passive"
          , grants = [ poisonResistance, poisonedSaveAdvantage ]
          }
      }

in  dwarvenResilience
