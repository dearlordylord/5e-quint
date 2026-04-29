let savageAttacker =
      { category = "origin"
      , description =
          "Once per turn when you hit a target with a weapon, you can roll the weapon's damage dice twice and use either roll against the target."
      , id = "feat_savage_attacker"
      , kind = "feat"
      , mechanics =
        { effect =
          { choose = "either_roll"
          , diceScope = "weapon_damage_dice"
          , kind = "reroll_weapon_damage_dice"
          }
        , family = "on_hit_trigger"
        , optional = True
        , trigger.kind = "weapon_hit"
        , usageLimit.kind = "once_per_turn"
        }
      , name = "Savage Attacker"
      , provenance = { kind = "srd-5.2.1", section = "Feats.md:47-51" }
      }

in  savageAttacker
