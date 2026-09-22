let auraOfCourage =
      { kind = "class_feature"
      , id = "paladin_aura_of_courage"
      , name = "Aura of Courage"
      , className = "paladin"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1", section = "classes.md:5708-5710" }

      , mechanics =
          { family = "passive"
          , grants = [ { kind = "grant_condition_immunity", condition = "frightened" } ]
          }
      }

in  auraOfCourage
