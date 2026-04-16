-- Charm Person — SRD 5.2.1 Spell, level 1, Enchantment.
-- Family: activation (single save_gate phase).
-- Target: one Humanoid (creature-type filter not expressible in surface).
-- Save: WIS → apply_condition charmed on fail, none on success.
-- Duration: timed 1 hour (NOT concentration).
-- Upcast: +1 target per slot above 1.
--
-- Two mechanics omitted (surface_widening):
--
-- 1. Conditional save advantage: "It does so with Advantage if you or
--    your allies are fighting it." The save_gate phase has no field for
--    a conditional advantage modifier on the target's save roll.
--    The v4 atom modify_roll_advantage exists but the surface has no
--    way to attach it as a conditional predicate on a save_gate input.
--
-- 2. Conditional break: "until the spell ends or until you or your
--    allies damage it." The timed Duration type has no break_trigger
--    field. The v4 lifecycle atom `break` exists but the TS surface
--    exposes no shape for a damage-triggered break on a timed effect.
--
-- The Humanoid-only restriction (affectsCreatureType) is also dropped:
-- there is no creature-type filter attachment variant in the surface.

let charmPerson =
      { kind = "spell"
      , id = "charm_person"
      , name = "Charm Person"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Charm Person"
          }
      , description =
          "One Humanoid you can see within range makes a Wisdom saving throw. It does so with Advantage if you or your allies are fighting it. On a failed save, the target has the Charmed condition until the spell ends or until you or your allies damage it. The Charmed creature is Friendly to you. When the spell ends, the target knows it was Charmed by you."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "enchantment"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 30 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "target"
                    , selection =
                        { mode = "choose_up_to"
                        , count =
                            { kind = "linear"
                            , base = 1
                            , perSlotAboveBase = 1
                            , baseLevel = 1
                            }
                        }
                    }
                , ability = "wis"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "apply_condition"
                    , condition = "charmed"
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  charmPerson
