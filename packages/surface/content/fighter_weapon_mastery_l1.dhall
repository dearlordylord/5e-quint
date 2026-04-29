let weaponMastery =
      { acquiredAtLevel = 1
      , className = "fighter"
      , description =
          "Your training with weapons allows you to use the mastery properties of three kinds of Simple or Martial weapons of your choice. Whenever you finish a Long Rest, you can practice weapon drills and change one of those weapon choices."
      , id = "fighter_weapon_mastery_l1"
      , kind = "class_feature"
      , mechanics =
        { changeOn = { count = 1, kind = "long_rest" }
        , choose = 3
        , eligibleWeapons = [ "simple", "martial" ]
        , family = "weapon_mastery_choice"
        }
      , name = "Weapon Mastery"
      , provenance =
        { kind = "srd-5.2.1", section = "Classes/Fighter.md:70-74" }
      }

in  weaponMastery
