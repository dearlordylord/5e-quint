import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  decodeReducerRoute,
  reducerRouteVariantTags,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";

const holeKindsPath = new URL(
  "../battle-runtime-hole-kinds.qnt",
  import.meta.url,
);
const fillKindsPath = new URL(
  "../battle-runtime-fill-kinds.qnt",
  import.meta.url,
);

function qntVariantTags(path: URL, suffix: "HoleKind" | "FillKind") {
  const variants = Array.from(
    readFileSync(path, "utf8").matchAll(/^\s*\|\s+(\w+Kind)\s*$/gm),
    (match) => match[1],
  );
  return variants.filter((variant) => variant.endsWith(suffix)).sort();
}

function routeKind(tag: string, suffix: "HoleKind" | "FillKind") {
  const stem = tag.slice(0, -suffix.length);
  return `${stem[0]?.toLowerCase()}${stem.slice(1)}`;
}

function discoverRoute(holeKindTag: string) {
  return [
    {
      tag: "RouteDiscoverBattleActs",
      value: {
        subject: "BattleActionRouteSubject",
        holes: new Set([holeKindTag]),
        owner: "BattleActionEconomyOwner",
      },
    },
  ];
}

function resolveRoute(fill: unknown) {
  return [
    {
      tag: "RouteResolveBattleSubject",
      value: {
        subject: "BattleActionRouteSubject",
        fill,
        holes: new Set(),
        owner: "BattleActionEconomyOwner",
      },
    },
  ];
}

function decodedFill(fill: unknown) {
  const event = decodeReducerRoute(resolveRoute(fill))[0];
  if (event?.kind !== "resolveBattleSubject") {
    throw new Error("Expected one reducer-route subject resolution.");
  }
  return event.fill;
}

describe("reducer route QNT vocabulary", () => {
  test("decoder accepts exactly every canonical hole-family tag", () => {
    const qntTags = qntVariantTags(holeKindsPath, "HoleKind");
    expect([...reducerRouteVariantTags().holeKinds].sort()).toEqual(qntTags);

    for (const tag of qntTags) {
      expect(decodeReducerRoute(discoverRoute(tag))).toEqual([
        {
          kind: "discoverBattleActs",
          subject: "battleAction",
          holes: [routeKind(tag, "HoleKind")],
          owner: "battleActionEconomy",
        },
      ]);
    }
  });

  test("decoder accepts exactly every canonical fill-kind tag", () => {
    const qntTags = qntVariantTags(fillKindsPath, "FillKind");
    const { genericFillKinds, structuredFillKinds } = reducerRouteVariantTags();
    expect([...genericFillKinds, ...structuredFillKinds].sort()).toEqual(
      qntTags,
    );

    for (const tag of genericFillKinds) {
      expect(
        decodeReducerRoute(
          resolveRoute({ tag: "RouteFillKind", value: { fill: tag } }),
        ),
      ).toEqual([
        {
          kind: "resolveBattleSubject",
          subject: "battleAction",
          fill: routeKind(tag, "FillKind"),
          holes: [],
          owner: "battleActionEconomy",
        },
      ]);
    }

    expect(
      decodedFill({
        tag: "RouteAbilityChoiceFill",
        value: { ability: "RouteAbilityStr" },
      }),
    ).toEqual({ kind: "abilityChoice", ability: "str" });
    expect(
      decodedFill({
        tag: "RouteSkillChoiceFill",
        value: { skill: "RouteSkillStealth" },
      }),
    ).toEqual({ kind: "skillChoice", skill: "stealth" });
    expect(
      decodedFill({
        tag: "RouteTargetAbilityChoicesFill",
        value: {
          choices: {
            primary: "RouteAbilityStr",
            secondary: "RouteAbilityDex",
          },
        },
      }),
    ).toEqual({
      kind: "targetAbilityChoices",
      choices: { primary: "str", secondary: "dex" },
    });
  });
});
