let oathOfDevotion =
      { className = "paladin"

      , featureGrants =
        [ { level = 3, unitId = "paladin_oath_of_devotion_spells" }
        , { level = 3, unitId = "paladin_sacred_weapon" }
        ]
      , id = "subclass_paladin_oath_of_devotion"
      , kind = "subclass"
      , name = "Oath of Devotion"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "classes.md#Paladin Subclass: Oath of Devotion"
          }
      }

in  oathOfDevotion
