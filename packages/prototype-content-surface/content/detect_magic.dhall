-- Detect Magic — SRD 5.2.1 Spell, level 1, Divination.
--
-- RAW (Spells / Descriptions A-D / Detect Magic):
--   "For the duration, you sense the presence of magical effects
--    within 30 feet of yourself. If you sense such effects, you can
--    take the Magic action to see a faint aura around any visible
--    creature or object in the area that bears the magic, and if an
--    effect was created by a spell, you learn the spell's school of
--    magic. The spell is blocked by 1 foot of stone, dirt, or wood;
--    1 inch of metal; or a thin sheet of lead."
--
-- Consolidated validation reference for:
--   • CastingTime.action.ritual = True (new widening — spells whose
--     header reads "Action or Ritual" expose the ritual branch as an
--     alternative 10-minute slotless cast. ~12 SRD utility spells
--     share this shape.)
--   • EffectAtom.detect { property = "magic", radiusFeet = 30 } (new
--     widening — divination scan for a closed property within a radius;
--     distinct from grant_sense which models permanent senses.)
--
-- The "Magic action to see a faint aura" follow-up and the
-- "blocked by 1 ft of stone / thin lead" barrier clause are DM / GM
-- agenda — the session resolves what's observable and how matter
-- attenuates magic. Omitted per ARCHITECTURE.md §1.

let detectMagic =
      { kind = "spell"
      , id = "detect_magic"
      , name = "Detect Magic"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Detect Magic"
          }
      , description =
          "For the duration, you sense the presence of magical effects within 30 feet of yourself. If you sense such effects, you can take the Magic action to see a faint aura around any visible creature or object in the area that bears the magic, and if an effect was created by a spell, you learn the spell's school of magic."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "divination"
          , castingTime = { kind = "action", ritual = True }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "detect"
                      , property = "magic"
                      , radiusFeet = 30
                      }
                    ]
                }
              ]
          }
      }

in  detectMagic
