-- Incendiary Cloud — SRD 5.2.1 Spell, level 8, Conjuration.
-- Family: ongoing_effect, following the Cloudkill surface pattern.
--
-- RAW (Spells/Descriptions-E-L#Incendiary Cloud):
--   "A swirling cloud of embers and smoke fills a 20-foot-radius
--    Sphere centered on a point within range."
--   "When the cloud appears, each creature in it makes a Dexterity
--    saving throw, taking 10d8 Fire damage on a failed save or half
--    as much damage on a successful one."
--   "A creature must also make this save when the Sphere moves into
--    its space and when it enters the Sphere or ends its turn there."
--   "A creature makes this save only once per turn."
--
-- PARTIAL: the recurring save is represented by the same
-- on_attached_turn_start convention used for Cloudkill. The
-- sphere-moving-into-space and creature-entering-space triggers
-- require the pending multi-operation area-trigger widening. The
-- strong-wind dispersal and Heavily Obscured visibility clauses are
-- caller-owned/DM-agenda at this surface layer.

let fireDamage =
      { kind = "damage"
      , damageType = "fire"
      , amount = { kind = "fixed", expr = { dice = 10, dieSize = 8 } }
      }

let area =
      { kind = "hole"
      , holeId = "incendiary_cloud_point"
      , label = "cloud origin point"
      , value =
          { kind = "area"
          , shape = { kind = "sphere", radiusFeet = 20 }
          , origin = { kind = "point_within_range" }
          }
      }

let recurringSave =
      { kind = "save_gate"
      , ability = "dex"
      , dc = { kind = "caster_spell_save_dc" }
      , onFail = fireDamage
      , onSuccess = { kind = "half_damage" }
      }

let incendiaryCloud =
      { kind = "spell"
      , id = "incendiary_cloud"
      , name = "Incendiary Cloud"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Incendiary Cloud"
          }
      , description =
          "A swirling cloud of embers and smoke fills a 20-foot-radius Sphere centered on a point within range. When the cloud appears, each creature in it makes a Dexterity saving throw, taking 10d8 Fire damage on a failed save or half as much damage on a successful one. A creature must also make this save when the Sphere moves into its space and when it enters the Sphere or ends its turn there, only once per turn. The cloud moves 10 feet away from you at the start of each of your turns."
      , mechanics =
          { family = "ongoing_effect"
          , level = 8
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 150 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment = area
          , initialPhase =
              { kind = "save_gate"
              , attachment = area
              , ability = "dex"
              , dc = { kind = "caster_spell_save_dc" }
              , onFail = fireDamage
              , onSuccess = { kind = "half_damage" }
              }
          , operations =
              [ { trigger = { kind = "on_attached_turn_start" }
                , effect = recurringSave
                }
              ]
          }
      }

in  incendiaryCloud
