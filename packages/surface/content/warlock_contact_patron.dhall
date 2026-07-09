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
-- The passive class-feature surface records:
--   • always-prepared Spell Access
--   • a separate feature free-cast resource that resets on a Long Rest
-- The sheet/session owner applies the feature-scoped automatic success on
-- Contact Other Plane's Intelligence saving throw when this free-cast route
-- is used to contact the patron.

let ContactPatronGrant : Type =
      { kind : Text
      , spellId : Text
      , mode : Optional Text
      , count : Optional Natural
      , resetCadence : Optional Text
      , scaling :
          Optional
            { axis : Text
            , tiers : List { atLevel : Natural, count : Natural }
            }
      }

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
                , mode = Some "prepared"
                , count = None Natural
                , resetCadence = None Text
                , scaling =
                    None
                      { axis : Text
                      , tiers : List { atLevel : Natural, count : Natural }
                      }
                }
              , { kind = "grant_spell_free_casts"
                , spellId = "contact_other_plane"
                , mode = None Text
                , count = Some 1
                , resetCadence = Some "long_rest"
                , scaling =
                    None
                      { axis : Text
                      , tiers : List { atLevel : Natural, count : Natural }
                      }
                }
              ] : List ContactPatronGrant
          }
      }

in  contactPatron
