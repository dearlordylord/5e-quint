-- Pact Magic - SRD 5.2.1 Warlock level 1.
--
-- Pact Magic slot capacity, slot level, cantrip access, prepared spell access,
-- spellcasting ability, and spellcasting focus are sourced from the Warlock
-- class record. This retained feature Unit projects those class spellcasting
-- facts for CharacterBuild feature ownership without duplicating the source
-- progression table.

let pactMagic =
      { acquiredAtLevel = 1
      , className = "warlock"
      , description =
          "Through occult ceremony, you have formed a pact with a mysterious entity to gain magical powers. The entity is a voice in the shadows—its identity unclear—but its boon to you is concrete: the ability to cast spells."
      , id = "warlock_pact_magic"
      , kind = "class_feature"
      , mechanics =
          { family = "class_spellcasting_projection"
          , source = "class_record_spellcasting"
          , spellcastingKind = "pact_magic_spellcasting_creation"
          }
      , name = "Pact Magic"
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Warlock.md:35-36,68-92" }
      }

in  pactMagic
