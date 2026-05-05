-- Contact Patron — SRD 5.2.1 Warlock level 9.
--
-- RAW (Classes / Warlock / Level 9: Contact Patron):
--   "In the past, you usually contacted your patron through
--    intermediaries. Now you can communicate directly; you always have
--    the Contact Other Plane spell prepared. With this feature, you can
--    cast the spell without expending a spell slot to contact your
--    patron, and you automatically succeed on the spell's saving throw.
--
--    Once you cast the spell with this feature, you can't do so in this
--    way again until you finish a Long Rest."
--
-- The existing passive class-feature surface cleanly covers:
--   • always prepared
--   • one free cast per long rest
--
-- The grant-scoped rider "you automatically succeed on the spell's
-- saving throw" does NOT fit the current `grant_spell_access` shape.
-- It is intentionally omitted here and recorded in
-- `proposal-warlock_contact_patron.md`.

let contactPatron =
      { kind = "class_feature"
      , id = "warlock_contact_patron"
      , name = "Contact Patron"
      , className = "warlock"
      , acquiredAtLevel = 9
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Warlock#Contact Patron"
          }
      , description =
          "In the past, you usually contacted your patron through intermediaries. Now you can communicate directly; you always have the Contact Other Plane spell prepared. With this feature, you can cast the spell without expending a spell slot to contact your patron, and you automatically succeed on the spell's saving throw. Once you cast the spell with this feature, you can't do so in this way again until you finish a Long Rest."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_spell_access"
                , spellId = "contact_other_plane"
                , mode = "prepared"
                }
              , { kind = "grant_spell_access"
                , spellId = "contact_other_plane"
                , mode = "once_per_long_rest"
                }
              ]
          }
      }

in  contactPatron
