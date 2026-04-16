-- Scorching Ray — SRD 5.2.1 Spell, level 2, Evocation.
-- Family: activation (three independent ranged spell attack phases, one per ray).
-- Each ray: ranged spell attack against a target within 120 ft; on hit 2d6 Fire damage.
-- Three rays are encoded as three identical attack_roll phases (base case, L2 slot).
-- OMITTED SCALING: "+1 ray per slot level above 2" — the surface has no variant of
-- ActivationMechanics that allows the phase count to scale with slot level.
-- → surface_widening required (see proposal-scorching_ray.md).

let ray =
      { kind = "attack_roll"
      , attachment =
          { kind = "target"
          , selection = { mode = "one" }
          }
      , attackKind = "ranged_spell_attack"
      , onHit =
          { kind = "damage"
          , damageType = "fire"
          , amount = { kind = "fixed", expr = { dice = 2, dieSize = 6 } }
          }
      , onMiss = { kind = "none" }
      }

let scorchingRay =
      { kind = "spell"
      , id = "scorching_ray"
      , name = "Scorching Ray"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-Q-Z#Scorching Ray"
          }
      , description =
          "You hurl three fiery rays. You can hurl them at one target within range or at several. Make a ranged spell attack for each ray. On a hit, the target takes 2d6 Fire damage. Using a Higher-Level Spell Slot: You create one additional ray for each spell slot level above 2."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration = { kind = "instantaneous" }
          , phases = [ ray, ray, ray ]
          }
      }

in  scorchingRay
