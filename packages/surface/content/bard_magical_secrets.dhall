let magicalSecrets =
      { kind = "class_feature"
      , id = "bard_magical_secrets"
      , name = "Magical Secrets"
      , className = "bard"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Bard.md:123-125" }

      , mechanics =
          { family = "prepared_spell_list_expansion"
          , baseSpellList = "bard"
          , additionalEligibleSpellLists = [ "cleric", "druid", "wizard" ]
          }
      }

in  magicalSecrets
