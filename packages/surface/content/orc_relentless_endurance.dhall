let relentlessEndurance =
      {  id = "orc_relentless_endurance"
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
        { kind = "srd-5.2.1", section = "character-origins.md#Orc" }
      , species = "orc"
      }

in  relentlessEndurance
