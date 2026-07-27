-- Detect Thoughts - SRD 5.2.1 Spell, level 2, Divination.
--
-- RAW (Spells/Descriptions-A-D#Detect Thoughts):
--   "You activate one of the effects below. Until the spell ends, you can
--    activate either effect as a Magic action on your later turns."
--   Sense Thoughts detects qualifying thoughts within 30 feet but does not
--   read them, and stone/dirt/wood, metal, or lead can block the spell.
--   Read Thoughts targets a visible or previously detected creature and can
--   lead to a later deeper probe with a Wisdom save and an Intelligence
--   (Arcana) check escape by the target.
--
-- The Surface record owns the Spell Definition and the Sense Thoughts
-- detection source fact. Thought content disclosure, qualifying language or
-- telepathy adjudication, material occlusion, hidden presence knowledge, and
-- the deeper-probe save/check exchange are table/social knowledge facts outside
-- promoted battle-runtime Unit profiles.

let radiusFeet = 30

let detectThoughts =
      { kind = "spell"
      , id = "detect_thoughts"
      , name = "Detect Thoughts"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Detect Thoughts"
          }
      , description =
          "You activate one of the effects below. Until the spell ends, you can activate either effect as a Magic action on later turns. Sense Thoughts detects the presence of thoughts within 30 feet of yourself from creatures that know languages or are telepathic; you don't read the thoughts. The spell is blocked by 1 foot of stone, dirt, or wood; 1 inch of metal; or a thin sheet of lead. Read Thoughts targets one creature you can see within 30 feet of yourself or one creature within 30 feet of yourself that you detected with Sense Thoughts. You learn what is most on the target's mind right now. If the target doesn't know any languages and isn't telepathic, you learn nothing. On your next turn, a Magic action can probe deeper: the target makes a Wisdom saving throw; on a failed save, you discern reasoning, emotions, and something that looms large in the target's mind; on a successful save, the spell ends. Either way, the target knows that you are probing. Until you shift attention away, the target can take an action to make an Intelligence (Arcana) check against your spell save DC, ending the spell on a success."
      , mechanics =
          { family = "activation"
          , level = 2
          , school = "divination"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = Some "1 Copper Piece"
              }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "detect"
                      , property = "thoughts"
                      , radiusFeet = radiusFeet
                      }
                    ]
                }
              ]
          }
      }

in  detectThoughts
