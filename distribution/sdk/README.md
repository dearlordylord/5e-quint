# D&D Rules SDK

SRD 5.2.1 character creation, character sheets, and battles. Requires Node
22.19 or later; ESM with TypeScript declarations.

```sh
pnpm add @dearlordylord/dnd-sdk
```

Import the owning API:

```ts
import { createCharacterDraft } from "@dearlordylord/dnd-sdk/character-creation";
import { srdSurface } from "@dearlordylord/dnd-sdk/catalog";
```

Exports: `character-creation`, `character-sheet`, `character-battle`, `battle`,
and `catalog`. These expose the repository's existing runtime contracts.
See the [repository](https://github.com/dearlordylord/5e-quint) for supported
journeys and package documentation. Coverage is partial; installation does not
imply complete SRD support. This package is separate from the opaque Cleanroom
Oracle and from independent Target SDK implementations.

Code: Apache 2.0. Included SRD material: CC BY 4.0. See LICENSE and NOTICE.
