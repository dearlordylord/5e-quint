let magicInitiateCleric =
      { category = "origin"
      , description =
          "Choose two Cleric cantrips. Choose one level 1 Cleric spell; you always have that spell prepared. You can cast it once without a spell slot. Choose Intelligence, Wisdom, or Charisma as the spellcasting ability. Whenever you gain a new level, you can replace one of the spells you chose with a different Cleric spell of the same level."
      , id = "feat_magic_initiate_cleric"
      , kind = "feat"
      , mechanics =
        { family = "magic_initiate", spellList = "cleric" }
      , name = "Magic Initiate (Cleric)"
      , provenance = { kind = "srd-5.2.1", section = "Feats.md:33-45" }
      }

in  magicInitiateCleric
