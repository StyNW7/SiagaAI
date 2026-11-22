/** Minimal ambient types so serverless wrappers type-check without @types/node. */
declare const process: { env: Record<string, string | undefined> };
