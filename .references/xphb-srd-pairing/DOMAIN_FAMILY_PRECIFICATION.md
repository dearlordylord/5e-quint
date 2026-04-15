# Domain Family Precification

Purpose:

- define the canonical domain-family split before Pass 1 extraction;
- keep the family list open for later extension, but only through explicit precification;
- prevent duplicate or ad hoc inventory files.

Pass 0 status:

- completed for the initial extraction wave;
- these files are the canonical Pass 1 homes for first-class unit inventories;
- if a new family is needed later, it must be added here and then indexed in `INDEX.md` before extraction starts.

## Canonical Families For Pass 1

- `UNITS_spells.md`
- `UNITS_feats.md`
- `UNITS_classes_and_features.md`
- `UNITS_species_and_background_traits.md`
- `UNITS_equipment_properties_and_masteries.md`
- `UNITS_magic_items.md`

## Inclusion Rules

- `spells`: named spell units from the PHB spell corpus.
- `feats`: named feat units from the PHB feat corpus.
- `classes_and_features`: class units, subclass units, and later feature subunits once extracted cleanly.
- `species_and_background_traits`: species and background units, plus later trait/feature subunits once extracted cleanly.
- `equipment_properties_and_masteries`: item properties, mastery properties, and closely related named equipment mechanics.
- `magic_items`: PHB magic-item procedural units now; future optional package item units later if the corpus and provenance model require them.

## Not Canonical Yet

- `actions_and_procedures`
- `conditions_and_statuses`
- `spellcasting_procedures`
- `rests_recovery_and_resources`
- `hazards_and_environment`
- `travel_and_mounts`

These may be admitted later, but only by updating this file and `INDEX.md` first.

## Pass 1 Record Shape

- `Name`
- `Kind`
- `Provenance`
- `PHB location`
- `Notes`

Pass 2 will enrich the same units with mechanic surfaces rather than creating a duplicate inventory.
