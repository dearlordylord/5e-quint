import { TypeSafeClient, TypeSafeDecisionModel } from "@effect/ai-typesafe";
import { Config, Layer } from "effect";
import type { TraitsConfig } from "traits";
import { codexLanguageModelLayer } from "./scripts/semantic-review/codex-language-model.ts";

export default {
  layerDecisionModel: TypeSafeDecisionModel.layer({ model: "jev-latest" }).pipe(
    Layer.provide(
      TypeSafeClient.layerConfig({
        apiKey: Config.Redacted("TYPESAFE_API_KEY"),
      }),
    ),
  ),
  layerLanguageModel: codexLanguageModelLayer,
} satisfies TraitsConfig;
