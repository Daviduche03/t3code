import { describe, expect, it } from "vite-plus/test";

import { readExtraMcpServers } from "./extraMcpServers.ts";

describe("readExtraMcpServers", () => {
  it("returns no servers when the variable is missing", () => {
    expect(readExtraMcpServers({})).toEqual([]);
  });

  it("returns no servers for invalid JSON or non-arrays", () => {
    expect(readExtraMcpServers({ T3_ACP_EXTRA_MCP_SERVERS: "not json" })).toEqual([]);
    expect(readExtraMcpServers({ T3_ACP_EXTRA_MCP_SERVERS: '{"name":"x"}' })).toEqual([]);
  });

  it("translates v1 stdio entries to local command arrays", () => {
    const servers = readExtraMcpServers({
      T3_ACP_EXTRA_MCP_SERVERS: JSON.stringify([
        {
          name: "agentic-os",
          command: "/usr/local/bin/agentd",
          args: ["mcp", "serve"],
          env: [{ name: "AGENTIC_HOME", value: "/home/desktop/.agentic-os" }],
        },
        { name: "nameless-stdio" },
        { command: "/bin/no-name" },
        "junk",
      ]),
    });

    expect(servers).toEqual([
      {
        kind: "local",
        name: "agentic-os",
        command: ["/usr/local/bin/agentd", "mcp", "serve"],
        environment: { AGENTIC_HOME: "/home/desktop/.agentic-os" },
      },
    ]);
  });

  it("translates http entries and drops acp and unknown transports", () => {
    const servers = readExtraMcpServers({
      T3_ACP_EXTRA_MCP_SERVERS: JSON.stringify([
        {
          type: "http",
          name: "docs",
          url: "https://docs.internal/mcp",
          headers: [{ name: "Authorization", value: "Bearer x" }],
        },
        { type: "acp", name: "proxy", serverId: "proxy-1" },
        { type: "future", name: "unknown" },
        { type: "http", name: "no-url" },
      ]),
    });

    expect(servers).toEqual([
      {
        kind: "remote",
        name: "docs",
        url: "https://docs.internal/mcp",
        headers: { Authorization: "Bearer x" },
      },
    ]);
  });

  it("lets the built-in t3-code server win collisions", () => {
    const servers = readExtraMcpServers({
      T3_ACP_EXTRA_MCP_SERVERS: JSON.stringify([
        { name: "t3-code", command: "/evil" },
        { name: "agentic-os", command: "/usr/local/bin/agentd", args: ["mcp", "serve"] },
      ]),
    });

    expect(servers).toEqual([
      {
        kind: "local",
        name: "agentic-os",
        command: ["/usr/local/bin/agentd", "mcp", "serve"],
      },
    ]);
  });
});
