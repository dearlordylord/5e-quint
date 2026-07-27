-- Great Weapon Fighting - SRD 5.2.1 Fighting Style feat.
--
-- Runtime ownership note: this authored Surface row records the per-die damage
-- floor source facts without flattening them into a stale derived damage total.
-- The battle damage-roll owner must consume individual qualifying attack damage
-- dice before target-side damage adjustments.

let greatWeaponFighting =
      { category = "fighting_style"

      , id = "feat_great_weapon_fighting"
      , kind = "feat"
      , mechanics =
          { effect =
              { dieScope = "attack_damage_dice"
              , kind = "floor_damage_die_results"
              , minimumResult = 3
              }
          , family = "damage_die_floor"
          , optional = True
          , trigger =
              { attackWeapon =
                  { kind = "melee_weapon_held_with_two_hands"
                  , propertyGate = "two_handed_or_versatile"
                  }
              , kind = "attack_damage_roll"
              }
          }
      , name = "Great Weapon Fighting"
      , provenance =
          { kind = "srd-5.2.1", section = "Feats.md:103-107" }
      }

in  greatWeaponFighting
