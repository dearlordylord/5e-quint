-- Detect Poison and Disease - SRD 5.2.1 Spell, level 1, Divination.
--
-- RAW (Spells / Descriptions A-D / Detect Poison and Disease):
--   "For the duration, you sense the location of poisons, poisonous
--    or venomous creatures, and magical contagions within 30 feet of
--    yourself. You sense the kind of poison, creature, or contagion in
--    each case."
--   "The spell is blocked by 1 foot of stone, dirt, or wood; 1 inch
--    of metal; or a thin sheet of lead."
--
-- This record reuses the Detect Magic activation, concentration, and
-- direct self detect atom shape with the existing poison_and_disease
-- detection property. Detection search, occlusion, and poison/disease
-- identification remain session/exploration runtime ownership and are
-- not promoted by this Spell Definition record.
let detectPoisonAndDisease =
      { kind = "spell"
      , id = "detect_poison_and_disease"
      , name = "Detect Poison and Disease"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Detect Poison and Disease"
          }
      , description =
          "For the duration, you sense the location of poisons, poisonous or venomous creatures, and magical contagions within 30 feet of yourself. You sense the kind of poison, creature, or contagion in each case."
      , mechanics =
          { family = "activation"
          , level = 1
          , school = "divination"
          , castingTime = { kind = "action", ritual = True }
          , range = { kind = "self" }
          , components = { v = True, s = True, m = Some "a yew leaf" }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "detect"
                      , property = "poison_and_disease"
                      , radiusFeet = 30
                      }
                    ]
                }
              ]
          }
      }

in  detectPoisonAndDisease
