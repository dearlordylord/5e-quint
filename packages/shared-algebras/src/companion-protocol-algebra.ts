export const RETAINED_COMPANION_PROTOCOL_TAGS = [
  "ordinaryFamiliarLikeOneAtATime",
  "attackExceptionFamiliarLikeOneAtATime",
  "ownerLongRestFamiliarLikeOneAtATime",
] as const;

export type RetainedCompanionProtocolTag =
  (typeof RETAINED_COMPANION_PROTOCOL_TAGS)[number];

export type RetainedCompanionProtocol = {
  readonly tag: RetainedCompanionProtocolTag;
};

export type RetainedCompanionProtocolFacts = {
  readonly initiative: "own";
  readonly attack:
    | { readonly tag: "cannotAttack" }
    | { readonly tag: "ownerForgoesAttackForReactionAttack" };
  readonly dismissal: { readonly tag: "temporaryDismissalAndReappearance" };
  readonly expiration:
    | { readonly tag: "none" }
    | { readonly tag: "ownerFinishedLongRest" };
  readonly formCatalog: "findFamiliar" | "pactOfTheChain";
};

const RETAINED_COMPANION_PROTOCOL_FACTS = {
  ordinaryFamiliarLikeOneAtATime: {
    initiative: "own",
    attack: { tag: "cannotAttack" },
    dismissal: { tag: "temporaryDismissalAndReappearance" },
    expiration: { tag: "none" },
    formCatalog: "findFamiliar",
  },
  attackExceptionFamiliarLikeOneAtATime: {
    initiative: "own",
    attack: { tag: "ownerForgoesAttackForReactionAttack" },
    dismissal: { tag: "temporaryDismissalAndReappearance" },
    expiration: { tag: "none" },
    formCatalog: "pactOfTheChain",
  },
  ownerLongRestFamiliarLikeOneAtATime: {
    initiative: "own",
    attack: { tag: "cannotAttack" },
    dismissal: { tag: "temporaryDismissalAndReappearance" },
    expiration: { tag: "ownerFinishedLongRest" },
    formCatalog: "findFamiliar",
  },
} as const satisfies Record<
  RetainedCompanionProtocolTag,
  RetainedCompanionProtocolFacts
>;

export function ordinaryFamiliarLikeProtocol(): RetainedCompanionProtocol {
  return { tag: "ordinaryFamiliarLikeOneAtATime" };
}

export function pactFamiliarLikeProtocol(): RetainedCompanionProtocol {
  return { tag: "attackExceptionFamiliarLikeOneAtATime" };
}

export function ownerLongRestExpiringFamiliarLikeProtocol(): RetainedCompanionProtocol {
  return { tag: "ownerLongRestFamiliarLikeOneAtATime" };
}

export function isRetainedCompanionProtocolTag(
  value: unknown,
): value is RetainedCompanionProtocolTag {
  return RETAINED_COMPANION_PROTOCOL_TAGS.some((tag) => tag === value);
}

export function isAttackExceptionRetainedCompanionProtocol(
  protocol: RetainedCompanionProtocol,
): boolean {
  return protocol.tag === "attackExceptionFamiliarLikeOneAtATime";
}

export function retainedCompanionProtocolFacts(
  protocol: RetainedCompanionProtocol,
): RetainedCompanionProtocolFacts {
  return RETAINED_COMPANION_PROTOCOL_FACTS[protocol.tag];
}
