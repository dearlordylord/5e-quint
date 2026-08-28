import {
  listenOracleHttpServerInternal,
  runOracleHttpServiceInternal,
} from "./oracle-http-internal.ts";
import type { OracleApplication } from "./oracle-distribution.ts";
import type {
  OracleBindPort,
  OracleLoopbackHost,
} from "./oracle-process-contract.ts";

export {
  ORACLE_HTTP_IDENTITY_PATH,
  ORACLE_HTTP_EVALUATIONS_PATH,
  ORACLE_HTTP_MAX_REQUEST_BYTES,
  ORACLE_HTTP_JSON_CONTENT_TYPE,
} from "./oracle-http-internal.ts";

export type {
  OracleHttpLifecycleIssue,
  OracleListeningHttpServer,
} from "./oracle-http-internal.ts";

export type OracleHttpServerOptions = {
  readonly application: OracleApplication;
  readonly host: OracleLoopbackHost;
  readonly port: OracleBindPort;
};

export type OracleHttpServiceOptions = OracleHttpServerOptions & {
  readonly writeReady: (text: string) => Promise<void>;
};

/** Bind one production Oracle HTTP server and return its assigned endpoint. */
export function listenOracleHttpServer(input: OracleHttpServerOptions) {
  return listenOracleHttpServerInternal(input);
}

/** Run the production loopback HTTP lifecycle until termination. */
export function runOracleHttpService(input: OracleHttpServiceOptions) {
  return runOracleHttpServiceInternal(input);
}
