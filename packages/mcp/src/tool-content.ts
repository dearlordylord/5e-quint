export function jsonContent(payload: unknown) {
  const serializablePayload = jsonSerializablePayload(payload);
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(serializablePayload, null, 2),
      },
    ] as const,
  };
}

export function jsonSerializablePayload(payload: unknown) {
  const json = JSON.stringify(payload);
  return json === undefined ? null : JSON.parse(json);
}

export function errorContent(message: string, details?: unknown) {
  return {
    ...jsonContent(
      details == null ? { error: message } : { error: message, details },
    ),
    isError: true as const,
  };
}

export function jsonContentPayload(content: {
  readonly content: readonly [{ readonly text: string }];
}): unknown {
  const text = content.content[0].text;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
