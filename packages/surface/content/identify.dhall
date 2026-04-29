-- Identify — SRD 5.2.1 Spell, level 1, Divination.
--
-- RAW (Spells / Descriptions E-L / Identify):
--   "You touch an object throughout the spell's casting. If the object
--    is a magic item or some other magical object, you learn its
--    properties and how to use them, whether it requires Attunement,
--    and how many charges it has, if any. You learn whether any
--    ongoing spells are affecting the item and what they are. If the
--    item was created by a spell, you learn that spell's name.
--    If you instead touch a creature throughout the casting, you
--    learn which ongoing spells, if any, are currently affecting it."
--
-- Consolidated validation reference for:
--   • Components.materialCostGp = 100 on a non-consumed material
--     (the "pearl worth 100+ GP" is costly but not consumed; contrast
--     with Protection from Evil and Good whose Holy Water both costs
--     GP and is consumed).
--   • CastingTime.minutes.ritual = True (1 minute or Ritual).
--
-- ZERO STRUCTURAL WIDENING. Identify's information-disclosure effect
-- (learning item properties, charges, attunement, ongoing spells) is
-- session-layer data lookup — the spec does not model the set of
-- facts the session exposes to the caster. Per ARCHITECTURE.md §1,
-- such disclosures are DM agenda and not surfaced here.

let identify =
      { kind = "spell"
      , id = "identify"
      , name = "Identify"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Identify"
          }
      , description =
          "You touch an object throughout the spell's casting. If the object is a magic item or some other magical object, you learn its properties and how to use them, whether it requires Attunement, and how many charges it has, if any. You learn whether any ongoing spells are affecting the item and what they are. If the item was created by a spell, you learn that spell's name. If you instead touch a creature throughout the casting, you learn which ongoing spells, if any, are currently affecting it."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "divination"
          , castingTime =
              { kind = "minutes", amount = 1, ritual = True }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "a pearl worth 100+ GP"
              , materialCostGp = 100
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  identify
