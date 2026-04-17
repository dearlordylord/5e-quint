-- Disintegrate — SRD 5.2.1 Spell, level 6, Transmutation.
--
-- RAW (Spells / Descriptions A-D / Disintegrate):
--   "You launch a green ray at a target you can see within range. The
--    target can be a creature, a nonmagical object, or a creation of
--    magical force, such as the wall created by Wall of Force. A
--    creature targeted by this spell makes a Dexterity saving throw.
--    On a failed save, the target takes 10d6 + 40 Force damage. If
--    this damage reduces it to 0 Hit Points, it and everything
--    nonmagical it is wearing and carrying are disintegrated into gray
--    dust. The target can be revived only by a True Resurrection or a
--    Wish spell."
--   "This spell automatically disintegrates a Large or smaller
--    nonmagical object or a creation of magical force. If such a
--    target is Huge or larger, this spell disintegrates a 10-foot-Cube
--    portion of it."
--   "Using a Higher-Level Spell Slot. The damage increases by 3d6 for
--    each spell slot level above 6."
--
-- PARTIAL AUTHOR. Core save_gate Dex → Force damage (with flat +40)
-- authored. Damage scales 3d6 per slot above 6.
--
-- DEFERRED.
--   1. "If this damage reduces it to 0 HP, it (and nonmagical gear) is
--      disintegrated into gray dust" — a zero-HP death-state rider
--      that blocks revival except via True Resurrection / Wish. No
--      current atom models a modified death-state with revival gating
--      (DEFERRED — death-state / revival-eligibility is session-layer
--      and has no surface atom today; pressure includes any spell
--      that modifies the revival pool).
--   2. "Automatically disintegrates a Large or smaller nonmagical
--      object / creation of magical force; Huge+ loses a 10-foot-Cube
--      portion" — object/world-object destruction is world-object
--      agenda (DEFERRED §B, sibling to Fabricate / Stone Shape).

let disintegrate =
      { kind = "spell"
      , id = "disintegrate"
      , name = "Disintegrate"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Disintegrate"
          }
      , description =
          "You launch a green ray at a target you can see within range. The target can be a creature, a nonmagical object, or a creation of magical force, such as the wall created by Wall of Force. A creature targeted by this spell makes a Dexterity saving throw. On a failed save, the target takes 10d6 + 40 Force damage. If this damage reduces it to 0 Hit Points, it and everything nonmagical it is wearing and carrying are disintegrated into gray dust. The target can be revived only by a True Resurrection or a Wish spell. This spell automatically disintegrates a Large or smaller nonmagical object or a creation of magical force. If such a target is Huge or larger, this spell disintegrates a 10-foot-Cube portion of it. Using a Higher-Level Spell Slot. The damage increases by 3d6 for each spell slot level above 6."
      , mechanics =
          { family = "activation"
          , level = 6
          , school = "transmutation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True
              , s = True
              , m = Some "a lodestone and dust"
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "save_gate"
                , attachment =
                    { kind = "target"
                    , selection = { mode = "one" }
                    }
                , ability = "dex"
                , dc = { kind = "caster_spell_save_dc" }
                , onFail =
                    { kind = "damage"
                    , damageType = "force"
                    , amount =
                        { kind = "linear_per_level"
                        , axis = "slot"
                        , base = { dice = 10, dieSize = 6, flat = 40 }
                        , perLevel = { dice = 3 }
                        , startingAtLevel = 6
                        }
                    }
                , onSuccess = { kind = "none" }
                }
              ]
          }
      }

in  disintegrate
