// Extra MCP servers for OpenCode sessions, from T3_ACP_EXTRA_MCP_SERVERS.
//
// Same variable the generic ACP adapter reads, translated to OpenCode's
// native `client.mcp.add` config shape. Entries use ACP mcpServers shape; a
// missing "type" means v1 stdio ({name, command, args?, env?}).
// {type:"acp"} entries are skipped: the native client has no ACP-transport
// channel. The built-in "t3-code" name always wins collisions.

export interface ExtraLocalServer {
  readonly kind: "local";
  readonly name: string;
  readonly command: ReadonlyArray<string>;
  readonly environment?: Record<string, string>;
}

export interface ExtraRemoteServer {
  readonly kind: "remote";
  readonly name: string;
  readonly url: string;
  readonly headers?: Record<string, string>;
}

export type ExtraMcpServer = ExtraLocalServer | ExtraRemoteServer;

export const EXTRA_MCP_SERVERS_ENV = "T3_ACP_EXTRA_MCP_SERVERS";

const BUILTIN_NAME = "t3-code";

export function readExtraMcpServers(
  environment: NodeJS.ProcessEnv = process.env,
): ReadonlyArray<ExtraMcpServer> {
  const raw = environment[EXTRA_MCP_SERVERS_ENV]?.trim();
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
  const servers: Array<ExtraMcpServer> = [];
  for (const entry of parsed) {
    const server = toExtraServer(entry);
    if (server !== undefined && server.name !== BUILTIN_NAME) {
      servers.push(server);
    }
  }
  return servers;
}

function toExtraServer(value: unknown): ExtraMcpServer | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const entry = value as Record<string, unknown>;
  if (typeof entry["name"] !== "string" || entry["name"].length === 0) {
    return undefined;
  }
  const name = entry["name"];
  switch (entry["type"]) {
    case undefined:
    case "stdio": {
      if (typeof entry["command"] !== "string") {
        return undefined;
      }
      const command = [entry["command"], ...stringArray(entry["args"])];
      const environment = envRecord(entry["env"]);
      return {
        kind: "local",
        name,
        command,
        ...(environment === undefined ? {} : { environment }),
      };
    }
    case "http": {
      if (typeof entry["url"] !== "string") {
        return undefined;
      }
      const headers = headersRecord(entry["headers"]);
      return {
        kind: "remote",
        name,
        url: entry["url"],
        ...(headers === undefined ? {} : { headers }),
      };
    }
    default:
      return undefined;
  }
}

function stringArray(value: unknown): Array<string> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function envRecord(value: unknown): Record<string, string> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const record: Record<string, string> = {};
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const pair = item as Record<string, unknown>;
    if (typeof pair["name"] === "string" && typeof pair["value"] === "string") {
      record[pair["name"]] = pair["value"];
    }
  }
  return Object.keys(record).length > 0 ? record : undefined;
}

function headersRecord(value: unknown): Record<string, string> | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const record: Record<string, string> = {};
  for (const item of value) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const pair = item as Record<string, unknown>;
    if (typeof pair["name"] === "string" && typeof pair["value"] === "string") {
      record[pair["name"]] = pair["value"];
    }
  }
  return Object.keys(record).length > 0 ? record : undefined;
}
