-- Dwarven Toughness (Dwarf) — SRD 5.2.1 species trait.

let dwarvenToughness =
      { kind = "species_trait"
      , id = "dwarf_dwarven_toughness"
      , name = "Dwarven Toughness"
      , species = "dwarf"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "character-origins.md:174"
          }
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "modify_max_hp"
                , direction = "increase"
                , delta =
                    { kind = "linear_per_level"
                    , axis = "character"
                    , base = { dice = 0, dieSize = 1, flat = 1 }
                    , perLevel = { flat = 1 }
                    , startingAtLevel = 1
                    }
                }
              ]
          }
      }

in  dwarvenToughness
