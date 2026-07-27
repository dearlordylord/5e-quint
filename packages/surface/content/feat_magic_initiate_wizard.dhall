let magicInitiateWizard =
      { category = "origin"
      , description =
          "Choose two Wizard cantrips. Choose one level 1 Wizard spell; you always have that spell prepared. You can cast it once without a spell slot. Choose Intelligence, Wisdom, or Charisma as the spellcasting ability. Whenever you gain a new level, you can replace one of the spells you chose with a different Wizard spell of the same level."
      , id = "feat_magic_initiate_wizard"
      , kind = "feat"
      , mechanics =
        { family = "magic_initiate", spellList = "wizard" }
      , name = "Magic Initiate (Wizard)"
      , provenance = { kind = "srd-5.2.1", section = "Feats.md:33-45" }
      }

in  magicInitiateWizard
