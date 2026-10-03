{ kind = "class_feature"
, id = "bard_magical_discoveries"
, name = "Magical Discoveries"
, className = "bard"
, acquiredAtLevel = 6
, provenance = { kind = "srd-5.2.1", section = "classes.md:1737-1742" }
, mechanics = { family = "chosen_prepared_spell_access"
          , eligibleSpellLists = [ "cleric", "druid", "wizard" ]
          , choiceCount = 2
          , eligibleSpellLevel = "cantrip_or_class_spell_slot"
          , preparation = "always_prepared"
          , replacement = { trigger = "class_level_gain", maximumCount = 1 }
          }
}
