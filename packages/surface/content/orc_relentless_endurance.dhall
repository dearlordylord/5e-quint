let relentlessEndurance =
      { description =
          "When you are reduced to 0 Hit Points but not killed outright, you can drop to 1 Hit Point instead. Once you use this trait, you can't do so again until you finish a Long Rest."
      , id = "orc_relentless_endurance"
      , kind = "species_trait"
      , mechanics =
        { effect = { kind = "prevent_drop_to_0_hp", replacementHp = 1 }
        , family = "triggered_replacement"
        , optional = True
        , resetCadence.kind = "long_rest"
        , trigger.kind = "reduced_to_0_hp_not_killed_outright"
        }
      , name = "Relentless Endurance"
      , provenance =
        { kind = "srd-5.2.1", section = "Character-Origins.md:259" }
      , species = "orc"
      }

in  relentlessEndurance
