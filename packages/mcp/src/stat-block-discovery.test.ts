import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { srdStatBlockCollection } from "@dnd/surface/surface/stat-block-catalog";
import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { handleToolCall } from "./server.ts";
import { jsonContentPayload } from "./tool-content.ts";

const PageSchema = Schema.Struct({
  statBlocks: Schema.Array(
    Schema.Struct({ statBlockId: Schema.String, name: Schema.String }),
  ),
  total: Schema.Number,
  nextOffset: Schema.NullOr(Schema.Number),
});

describe("Stat Block discovery", () => {
  it("returns bounded encounter choices without loading every procedure", () => {
    const root = createMcpPlaySessionRoot();
    const response = jsonContentPayload(
      handleToolCall(root, "list_stat_blocks", {}),
    );
    const page = Schema.decodeUnknownSync(PageSchema)(response);
    expect(page.statBlocks).toHaveLength(20);
    expect(page.total).toBe(srdStatBlockCollection.statBlocks.length);
    expect(page.nextOffset).toBe(20);
    expect(JSON.stringify(response)).not.toContain('"orderedProcedures"');
    expect(JSON.stringify(response)).not.toContain('"attacks"');
  });

  it("finds authored names and ids without a Play Session", () => {
    const root = createMcpPlaySessionRoot();
    for (const query of ["Goblin Warrior", "stat_block_goblin_warrior"]) {
      const response = jsonContentPayload(
        handleToolCall(root, "list_stat_blocks", { query }),
      );
      const page = Schema.decodeUnknownSync(PageSchema)(response);
      expect(page.statBlocks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ statBlockId: "stat_block_goblin_warrior" }),
        ]),
      );
      expect(page.nextOffset).toBeNull();
      expect(response).toMatchObject({
        statBlocks: expect.arrayContaining([
          expect.objectContaining({ challengeRating: expect.any(Number) }),
        ]),
      });
    }
  });

  it("enumerates every installed identity exactly once through explicit pages", () => {
    const root = createMcpPlaySessionRoot();
    const ids: string[] = [];
    let offset: number | null = 0;
    do {
      const page = Schema.decodeUnknownSync(PageSchema)(
        jsonContentPayload(
          handleToolCall(root, "list_stat_blocks", { offset, limit: 50 }),
        ),
      );
      ids.push(...page.statBlocks.map(({ statBlockId }) => statBlockId));
      offset = page.nextOffset;
    } while (offset !== null);
    expect(ids).toEqual(
      srdStatBlockCollection.statBlocks.map(({ id }) => id).sort(),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("distinguishes an empty search result from another page and rejects unbounded reads", () => {
    const root = createMcpPlaySessionRoot();
    const empty = Schema.decodeUnknownSync(PageSchema)(
      jsonContentPayload(
        handleToolCall(root, "list_stat_blocks", {
          query: "synthetic-absent-creature",
        }),
      ),
    );
    expect(empty).toEqual({ statBlocks: [], total: 0, nextOffset: null });
    for (const args of [
      { limit: 0 },
      { limit: 51 },
      { offset: -1 },
      { query: " " },
    ]) {
      expect(handleToolCall(root, "list_stat_blocks", args)).toMatchObject({
        isError: true,
      });
    }
  });
});
