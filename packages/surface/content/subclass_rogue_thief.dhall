let thief =
      { className = "rogue"
      , description =
          "The Thief Rogue subclass choice. Subclass feature Units are modeled separately from the choice boundary."
      , featureGrants = [] : List { level : Natural, unitId : Text }
      , id = "subclass_rogue_thief"
      , kind = "subclass"
      , name = "Thief"
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Rogue.md:85-87,153-191" }
      }

in  thief
