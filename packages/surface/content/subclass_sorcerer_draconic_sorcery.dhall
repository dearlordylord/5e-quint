let draconicSorcery =
      { className = "sorcerer"
      , description =
          "The Draconic Sorcery Sorcerer subclass choice. Subclass feature Units are modeled separately from the choice boundary."
      , featureGrants = [] : List { level : Natural, unitId : Text }
      , id = "subclass_sorcerer_draconic_sorcery"
      , kind = "subclass"
      , name = "Draconic Sorcery"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Classes/Sorcerer.md:119-121,407-444"
          }
      }

in  draconicSorcery
