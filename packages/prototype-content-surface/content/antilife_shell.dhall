-- Antilife Shell — SRD 5.2.1 Spell, level 5, Abjuration.
--
-- RAW (Spells/Descriptions-A-D#Antilife Shell):
--   "An aura extends from you in a 10-foot Emanation for the duration."
--   "The aura prevents creatures other than Constructs and Undead from
--    passing or reaching through it."
--   "An affected creature can cast spells or make attacks with Ranged
--    or Reach weapons through the barrier."
--
-- PARTIAL: "If you move so that an affected creature is forced to pass
-- through the barrier, the spell ends" is not represented; that requires
-- a movement-caused-end trigger owned by the geometry/session layer.

let antilifeShell =
      { kind = "spell"
      , id = "antilife_shell"
      , name = "Antilife Shell"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Antilife Shell"
          }
      , description =
          "An aura extends from you in a 10-foot Emanation for the duration. The aura prevents creatures other than Constructs and Undead from passing or reaching through it. An affected creature can cast spells or make attacks with Ranged or Reach weapons through the barrier. If you move so that an affected creature is forced to pass through the barrier, the spell ends."
      , mechanics =
          { family = "ongoing_effect"
          , level = 5
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "hour", amount = 1 }
              }
          , attachment =
              { kind = "area"
              , shape = { kind = "emanation", radiusFeet = 10 }
              , origin = { kind = "self" }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "prevent_creature_passage"
                    , exceptCreatureTypes = [ "construct", "undead" ]
                    , allowsThroughBarrier =
                        [ "spells", "ranged_attacks", "reach_weapon_attacks" ]
                    }
                }
              ]
          }
      }

in  antilifeShell
