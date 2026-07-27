let sacredWeapon =
      { kind = "class_feature"
      , id = "paladin_sacred_weapon"
      , name = "Sacred Weapon"
      , className = "paladin"
      , acquiredAtLevel = 3
      , provenance =
          { kind = "srd-5.2.1", section = "Classes/Paladin.md:263-272" }
      , description =
          "When you take the Attack action, you can expend one use of your Channel Divinity to imbue one Melee weapon that you are holding with positive energy. For 10 minutes or until you use this feature again, you add your Charisma modifier to attack rolls you make with that weapon (minimum bonus of +1), and each time you hit with it, you cause it to deal its normal damage type or Radiant damage. The weapon also emits Bright Light in a 20-foot radius and Dim Light 20 feet beyond that."
      , mechanics =
          { family = "sacred_weapon"
          , activationCost = { kind = "standard_action", action = "attack" }
          , spends = { resourceUnitId = "paladin_channel_divinity", amount = 1 }
          , target = { kind = "held_melee_weapon" }
          , duration =
              { unit = "minute"
              , amount = 10
              , endsOn =
                [ "use_feature_again"
                , "dismiss_no_action"
                , "not_carrying_weapon"
                ]
              }
          , attackRollBonus =
              { kind = "ability_modifier"
              , ability = "cha"
              , minimum = 1
              , appliesTo = "imbued_weapon_attack_rolls"
              }
          , hitDamageType = { choice = [ "normal", "radiant" ] }
          , light = { brightRadiusFeet = 20, dimAdditionalFeet = 20 }
          }
      }

in  sacredWeapon
