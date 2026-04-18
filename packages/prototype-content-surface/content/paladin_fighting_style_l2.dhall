-- Paladin Fighting Style — SRD 5.2.1, Level 2.
--
-- The primary mechanic encodes cleanly: grant a Fighting Style feat
-- (same pattern as Fighter Fighting Style L1).
--
-- The Blessed Warrior alternative ("Instead of choosing one of those
-- feats, you can choose the option below") is omitted — the surface
-- lacks a way to express "grant_feat OR a custom non-feat bundle."
-- See proposal-paladin_fighting_style_l2.md for the widening record.

let paladinFightingStyleL2 =
      { kind = "class_feature"
      , id = "paladin_fighting_style_l2"
      , name = "Fighting Style"
      , className = "paladin"
      , acquiredAtLevel = 2
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Paladin#Fighting Style"
          }
      , description =
          "You gain a Fighting Style feat of your choice (see \"Feats\" for feats). Instead of choosing one of those feats, you can choose the option below.\n\nBlessed Warrior. You learn two Cleric cantrips of your choice. The chosen cantrips count as Paladin spells for you, and Charisma is your spellcasting ability for them. Whenever you gain a Paladin level, you can replace one of these cantrips with another Cleric cantrip."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_feat", category = "fighting_style" } ]
          }
      }

in  paladinFightingStyleL2
