let magicalSecrets =
      { kind = "class_feature"
      , id = "bard_magical_secrets"
      , name = "Magical Secrets"
      , className = "bard"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Bard.md:123-125" }
      , description =
          "Whenever you reach a Bard level, including this level, and the Prepared Spells number in the Bard Features table increases, you can choose any of your new prepared spells from the Bard, Cleric, Druid, and Wizard spell lists, and the chosen spells count as Bard spells for you. Whenever you replace a spell prepared for this class, you can replace it with a spell from those lists. Surface owner need: Spell Access must widen the Bard prepared-spell source to a combined Bard/Cleric/Druid/Wizard list for new prepared spells and replacement choices without duplicating class spell lists."
      , mechanics = { family = "passive", grants = [] : List {} }
      }

in  magicalSecrets
