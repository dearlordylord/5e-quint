# D&D MCP

Create D&D characters and play through combat with an AI assistant backed by
an executable rules engine. This [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
server gives your assistant tools to apply D&D 5e SRD 5.2.1 rules, track character
state, and discover what you can do next.

You make the choices; your assistant presents options and asks for missing
information; the engine checks supported actions and resolves their effects.

## What play looks like

An example from a tested encounter, shortened for readability. Mira is a level 1
fighter who bought and equipped a Longsword, Chain Mail, and Shield during
character creation. The player supplies the rolls; the engine resolves the
attack and updates the battle.

> **Player:** What can Mira do?
>
> **Assistant:** You can attack with your longsword. Which target?
>
> **Player:** The goblin. It's 5 feet away. I'll roll at the table.
>
> **Assistant:** Tell me your attack roll.
>
> **Player:** 17 total.
>
> **Assistant:** That hits. Roll a d8 for damage.
>
> **Player:** 5.
>
> **Assistant:** With your +3 damage modifier, that's 8 slashing damage.
> The goblin has 2 HP left. Mira still has 13 HP. What would you like to do next?

The choices and questions depend on the character and battle state. Your
assistant discovers available actions and supplies your answers through MCP
tools.

## What you can do

- Build a character from the included SRD classes, species, backgrounds, and
  other character options.
- Advance characters, inspect their sheets, manage resources, and take rests.
- Run encounters with characters and SRD monsters, choose actions, and track
  their effects on the battle and character sheets.
- Browse the installed catalog of abilities, spells, and monster stat blocks.

See the project's [documented support scope](https://github.com/dearlordylord/5e-quint#readme)
for class progression and supported mechanics.

## Connect your assistant

You need **Node.js 22.19 or later**, **pnpm**, and an AI client that can launch
local MCP servers over stdio. This package supplies the server; you interact
through your AI client.

For clients that accept an `mcpServers` configuration, add:

```json
{
  "mcpServers": {
    "dnd": {
      "command": "pnpm",
      "args": ["dlx", "@dearlordylord/dnd-mcp"]
    }
  }
}
```

Reload your client's MCP connection, then try:

> Create a level 1 fighter. Walk me through the available choices.

Other starting prompts:

- "What SRD monsters are available for an encounter?"
- "Show my character sheet and remaining resources."
- "Start an encounter with my character and a goblin. Ask me for the setup facts."

To launch the server directly:

```sh
pnpm dlx @dearlordylord/dnd-mcp
```

The command waits for an MCP client to communicate over stdio; it does not open
a game screen or chat prompt. For reproducible configuration, pin a released
version in the `args` array, for example:

```json
["dlx", "@dearlordylord/dnd-mcp@0.1.1"]
```

## Before you play

- **Content:** the included catalog contains redistributable SRD 5.2.1 content.
  Other official books and custom content are not included, and this MCP does
  not provide an import tool for them.
- **Table input:** you supply decisions, roll results, and facts such as targets
  and distances when requested. An optional `roll_dice` tool samples dice faces;
  it does not automatically answer the engine's questions.
- **Session lifetime:** this local stdio server keeps play state in memory.
  Stopping or restarting its process loses those sessions. Persistent HTTP
  hosting is a [separate deployment](https://github.com/dearlordylord/5e-quint/blob/master/operations/public-mcp/README.md).

## Learn more

- [Tool workflows and session behavior](https://github.com/dearlordylord/5e-quint/blob/master/packages/mcp/README.md#tool-workflows)
- [Project overview and rules-engine design](https://github.com/dearlordylord/5e-quint#readme)
- [TypeScript SDK](https://www.npmjs.com/package/@dearlordylord/dnd-sdk) for building your own application
- [Report an issue](https://github.com/dearlordylord/5e-quint/issues)

## License

Code: Apache 2.0. Included SRD material: CC BY 4.0. See LICENSE and NOTICE.
Bundled dependency licenses are included in `dist/THIRD-PARTY-NOTICES.txt`.
