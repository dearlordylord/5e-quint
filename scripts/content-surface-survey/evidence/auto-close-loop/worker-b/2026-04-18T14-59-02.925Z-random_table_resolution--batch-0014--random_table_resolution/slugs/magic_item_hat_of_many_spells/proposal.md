`Hat of Many Spells` should not be forced into a placeholder `magic_item` encoding.

The top-level record kind is available: this is still a `magic_item`, and a `composite` shape would be the honest family if the sub-parts fit. The failure is lower-level.

Blocking gaps:

- The core property is not fixed-spell item casting. It is an activation-time attempt to cast any qualifying Wizard spell you do not know. The current surface only grants named spell ids.
- The activation spends the wielder's spell slot. Non-spell activations can only spend `use_count` or `charge_pool`.
- The once-per-rest lockout applies only on success. Current activation resources/cooldowns are unconditional once the activation starts.
- The random-failure table includes a temporary two-way portal. Existing atoms can exile or teleport subjects, but they do not create a persistent portal in space.

Secondary follow-up pressure, not the first blocker:

- `Spellcasting Focus` support is not modeled on the magic-item surface.
- The random table also produces nonmagical objects, temporary magic items, and uncontrolled creature appearances. Those branches would need either existing-surface extensions or explicit scoped omissions if this unit were revisited after the core blockers above were addressed.

Recommended classification: `atom_widening`.

Why not `structural_widening`:

- The item still fits the existing top-level `magic_item` kind.
- A composite passive + activation shape is plausible.
- The current failure is that required sub-shapes are missing, including at least one mechanic (`create_portal`) that is not present in the v4 atom inventory.
