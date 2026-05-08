let weaponMastery =
      { acquiredAtLevel = 1
      , className = "barbarian"
      , description =
          "Your training with weapons allows you to use the mastery properties of two kinds of Simple or Martial Melee weapons of your choice, such as Greataxes and Handaxes. Whenever you finish a Long Rest, you can practice weapon drills and change one of those weapon choices."
      , id = "barbarian_weapon_mastery"
      , kind = "class_feature"
      , mechanics =
        { changeOn = { count = 1, kind = "long_rest" }
        , choose = 2
        , eligibleWeapons =
          { kind = "class_proficient_weapons", usage = "melee" }
        , family = "weapon_mastery_choice"
        }
      , name = "Weapon Mastery"
      , provenance =
        { kind = "srd-5.2.1", section = "Classes/Barbarian.md:84-88" }
      }

in  weaponMastery
