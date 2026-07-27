let auraOfCourage =
      { kind = "class_feature"
      , id = "paladin_aura_of_courage"
      , name = "Aura of Courage"
      , className = "paladin"
      , acquiredAtLevel = 10
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Paladin.md:148-150" }

      , mechanics =
          { family = "passive"
          , grants = [ { kind = "grant_condition_immunity", condition = "frightened" } ]
          }
      }

in  auraOfCourage
