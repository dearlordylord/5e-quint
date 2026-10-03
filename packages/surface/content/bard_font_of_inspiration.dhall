{ kind = "class_feature"
, id = "bard_font_of_inspiration"
, name = "Font of Inspiration"
, className = "bard"
, acquiredAtLevel = 5
, provenance = { kind = "srd-5.2.1", section = "classes.md:908-912" }
, mechanics = { family = "use_count_resource_recovery"
          , resourceUnitId = "bard_bardic_inspiration"
          , restRecovery = { resetCadence = { kind = "short_or_long_rest" }, amount = "all_expended" }
          , spellSlotExchange = { actionCost = "none", spellSlotCount = 1, restoredUses = 1, requiresExpendedUse = True }
          }
}
