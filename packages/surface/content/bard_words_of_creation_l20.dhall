-- Words of Creation — SRD 5.2.1 Bard level 20.
--
-- RAW (Classes / Bard / Level 20: Words of Creation):
--   "You have mastered two of the Words of Creation: the words of life
--    and death. You therefore always have the Power Word Heal and Power
--    Word Kill spells prepared. When you cast either spell, you can
--    target a second creature with it if that creature is within 10 feet
--    of the first target."
--
-- Part 1: always prepared — two grant_spell_access atoms in a passive
-- family cleanly encode the "always prepared" clause for both spells.
--
-- Part 2: secondary target within 10 feet — OMITTED. No v4 atom or
-- grant_spell_access field models "extend the target count of a specific
-- named spell when cast, bounded by proximity to the primary target."
-- Recorded in proposal-bard_words_of_creation_l20.md.

let wordsOfCreation =
      { kind = "class_feature"
      , id = "bard_words_of_creation_l20"
      , name = "Words of Creation"
      , className = "bard"
      , acquiredAtLevel = 20
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Bard#Words of Creation"
          }
      , description =
          "You have mastered two of the Words of Creation: the words of life and death. You therefore always have the Power Word Heal and Power Word Kill spells prepared. When you cast either spell, you can target a second creature with it if that creature is within 10 feet of the first target."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_spell_access"
                , spellId = "power_word_heal"
                , mode = "prepared"
                }
              , { kind = "grant_spell_access"
                , spellId = "power_word_kill"
                , mode = "prepared"
                }
              ]
          }
      }

in  wordsOfCreation
