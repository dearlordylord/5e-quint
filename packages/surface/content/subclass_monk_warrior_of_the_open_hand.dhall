let warriorOfTheOpenHand =
      { className = "monk"
      , description =
          "The Warrior of the Open Hand Monk subclass choice. Subclass feature Units are modeled separately from the choice boundary."
      , featureGrants = [] : List { level : Natural, unitId : Text }
      , id = "subclass_monk_warrior_of_the_open_hand"
      , kind = "subclass"
      , name = "Warrior of the Open Hand"
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Monk.md:108-110,186-212" }
      }

in  warriorOfTheOpenHand
