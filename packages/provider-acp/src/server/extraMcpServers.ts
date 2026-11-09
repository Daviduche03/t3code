import type * as EffectAcpSchema from "effect-acp/compat";

// Extra MCP servers appended to every ACP session setup payload, from JSON
// in T3_ACP_EXTRA_MCP_SERVERS. Entries use ACP mcpServers shape; a missing
// "type" means v1 stdio ({name, command, args?, env?}).
export function readExtraMcpServers(
  environment: NodeJS.ProcessEnv = process.env,
): ReadonlyArray<EffectAcpSchema.McpServer> {
  const raw = environment["T3_ACP_EXTRA_MCP_SERVERS"]?.trim();
  if (!raw) {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter(isMcpServer);
}

// Appended to whichever channel the session sends. Entries collide by name
// with the built-in t3-code server never win; explicit config stays additive.
export function mergeExtraMcpServers(
  base: ReadonlyArray<EffectAcpSchema.McpServer>,
  extra: ReadonlyArray<EffectAcpSchema.McpServer>,
): ReadonlyArray<EffectAcpSchema.McpServer> {
  if (extra.length === 0) {
    return base;
  }
  const names = new Set(base.map((server) => server.name));
  return [...base, ...extra.filter((server) => !names.has(server.name))];
}

function isMcpServer(value: unknown): value is EffectAcpSchema.McpServer {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  if (typeof entry["name"] !== "string" || entry["name"].length === 0) {
    return false;
  }
  switch (entry["type"]) {
    case undefined:
      return typeof entry["command"] === "string";
    case "stdio":
      return typeof entry["command"] === "string";
    case "http":
      return typeof entry["url"] === "string";
    case "acp":
      return typeof entry["serverId"] === "string";
    default:
      return false;
  }
}
