import { describe, expect, it } from "vite-plus/test";

import { readExtraMcpServers, mergeExtraMcpServers } from "./extraMcpServers.ts";

describe("readExtraMcpServers", () => {
  it("returns no servers when the variable is missing", () => {
    expect(readExtraMcpServers({})).toEqual([]);
  });

  it("returns no servers for invalid JSON or non-arrays", () => {
    expect(readExtraMcpServers({ T3_ACP_EXTRA_MCP_SERVERS: "not json" })).toEqual([]);
    expect(readExtraMcpServers({ T3_ACP_EXTRA_MCP_SERVERS: '{"name":"x"}' })).toEqual([]);
  });

  it("keeps v1 stdio entries and drops malformed ones", () => {
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
        name: "agentic-os",
        command: "/usr/local/bin/agentd",
        args: ["mcp", "serve"],
        env: [{ name: "AGENTIC_HOME", value: "/home/desktop/.agentic-os" }],
      },
    ]);
  });

  it("keeps typed http and acp entries", () => {
    const servers = readExtraMcpServers({
      T3_ACP_EXTRA_MCP_SERVERS: JSON.stringify([
        { type: "http", name: "docs", url: "https://docs.internal/mcp" },
        { type: "acp", name: "proxy", serverId: "proxy-1" },
        { type: "stdio", name: "local", command: "/opt/mcp" },
        { type: "http", name: "no-url" },
        { type: "future", name: "unknown" },
      ]),
    });

    expect(servers).toEqual([
      { type: "http", name: "docs", url: "https://docs.internal/mcp" },
      { type: "acp", name: "proxy", serverId: "proxy-1" },
      { type: "stdio", name: "local", command: "/opt/mcp" },
    ]);
  });
});

describe("mergeExtraMcpServers", () => {
  const builtin = { name: "t3-code", command: "/t3", args: ["acp-mcp-bridge"] };
  const extra = { name: "agentic-os", command: "/usr/local/bin/agentd", args: ["mcp", "serve"] };

  it("returns the base array untouched when there is nothing extra", () => {
    expect(mergeExtraMcpServers([builtin], [])).toEqual([builtin]);
  });

  it("appends extras and lets the built-in name win collisions", () => {
    expect(mergeExtraMcpServers([builtin], [extra, builtin])).toEqual([builtin, extra]);
  });
});
