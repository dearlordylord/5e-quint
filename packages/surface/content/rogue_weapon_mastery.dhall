let weaponMastery =
      { acquiredAtLevel = 1
      , className = "rogue"

      , id = "rogue_weapon_mastery"
      , kind = "class_feature"
      , mechanics =
        { changeOn = { count = 2, kind = "long_rest" }
        , choose = 2
        , eligibleWeapons = { kind = "class_proficient_weapons" }
        , family = "weapon_mastery_choice"
        }
      , name = "Weapon Mastery"
      , provenance =
        { kind = "srd-5.2.1", section = "Classes/Rogue.md:75-79" }
      }

in  weaponMastery
