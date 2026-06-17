-- Two-Weapon Fighting - SRD 5.2.1 Fighting Style feat.
--
-- Runtime ownership note: this authored Surface row records the source fact
-- that a Light-property extra attack may add the attack's ordinary damage
-- ability modifier when that attack is not already adding it. The battle
-- Light extra attack damage owner must compute the actual modifier from the
-- attack facts; this row must not duplicate that damage-modifier rule.

let twoWeaponFighting =
      { category = "fighting_style"
      , description =
          "When you make an extra attack as a result of using a weapon that has the Light property, you can add your ability modifier to the damage of that attack if you aren't already adding it to the damage."
      , id = "feat_two_weapon_fighting"
      , kind = "feat"
      , mechanics =
          { effect =
              { appliesWhen = "not_already_adding_ability_modifier"
              , kind = "permit_attack_damage_ability_modifier"
              , modifierSource = "attack_ability_modifier"
              }
          , family = "light_extra_attack_damage_ability_modifier"
          , optional = True
          , trigger =
              { attackWeapon = { kind = "weapon_with_light_property" }
              , kind = "light_property_extra_attack_damage_roll"
              }
          }
      , name = "Two-Weapon Fighting"
      , provenance =
          { kind = "srd-5.2.1", section = "Feats.md:109-113" }
      }

in  twoWeaponFighting
