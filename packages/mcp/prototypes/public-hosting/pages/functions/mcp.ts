import { handlePrototypeMcpRequest } from "../../handler.ts";

export const onRequest = (context: { readonly request: Request }) =>
  handlePrototypeMcpRequest(context.request);
