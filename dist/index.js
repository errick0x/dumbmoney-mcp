#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const BASE_URL = "https://dumbmoney.win";
const API_KEY = process.env.DUMBMONEY_API_KEY || "";
const server = new McpServer({
    name: "dumbmoney",
    version: "1.2.0",
});
async function fetchApi(path) {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) {
        const body = await res.text();
        throw new Error(`API error ${res.status}: ${body}`);
    }
    return res.json();
}
async function postApi(path, body) {
    const headers = {
        "Content-Type": "application/json",
    };
    if (API_KEY) {
        headers["X-API-Key"] = API_KEY;
    }
    const res = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API error ${res.status}: ${text}`);
    }
    return res.json();
}
// Tool 1: List all tokens
server.registerTool("list_tokens", {
    description: "List all reflection tokens on DumbMoney. Returns name, symbol, mint address, reflection rate, price, market cap, bonding curve progress, and total reflections paid.",
    inputSchema: {},
}, async () => {
    const tokens = await fetchApi("/api/tokens");
    return {
        content: [{ type: "text", text: JSON.stringify(tokens, null, 2) }],
    };
});
// Tool 2: Get token details
server.registerTool("get_token", {
    description: "Get detailed info about a specific DumbMoney reflection token by its Solana mint address. Returns on-chain data including price, reflection rate, burn rate, market cap, bonding curve progress, and total reflections paid.",
    inputSchema: {
        mint: z
            .string()
            .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
            .describe("Solana mint address of the token"),
    },
}, async ({ mint }) => {
    const token = await fetchApi(`/api/tokens/${mint}`);
    return {
        content: [{ type: "text", text: JSON.stringify(token, null, 2) }],
    };
});
// Tool 3: Check wallet earnings
server.registerTool("check_earnings", {
    description: "Check a wallet's pending reflection earnings for a specific DumbMoney token. Returns pending SOL and USD earnings, share percentage, and holder shares. Returns zero values if the wallet has no position.",
    inputSchema: {
        mint: z
            .string()
            .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
            .describe("Solana mint address of the token"),
        wallet: z
            .string()
            .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
            .describe("Solana wallet address to check earnings for"),
    },
}, async ({ mint, wallet }) => {
    const earnings = await fetchApi(`/api/tokens/${mint}/earnings?wallet=${wallet}`);
    return {
        content: [{ type: "text", text: JSON.stringify(earnings, null, 2) }],
    };
});
// Tool 4: Top earning tokens
server.registerTool("top_earners", {
    description: "Get the top 10 DumbMoney tokens ranked by total reflections paid to holders. Shows which tokens have generated the most passive income for their holders.",
    inputSchema: {},
}, async () => {
    const earners = await fetchApi("/api/top-earners");
    return {
        content: [{ type: "text", text: JSON.stringify(earners, null, 2) }],
    };
});
// Tool 5: Create a new reflection token
server.registerTool("create_token", {
    description: "Launch a new reflection token on DumbMoney. Creates the token on-chain with Token-2022 transfer fees. Requires DUMBMONEY_API_KEY to be set. The server handles image upload, metadata, and on-chain creation. Provide one of: image_url (existing URL), image_base64 (raw image), or dalle_prompt (AI-generated image).",
    inputSchema: {
        name: z.string().max(32).describe("Token name (max 32 chars)"),
        symbol: z.string().max(10).describe("Token ticker symbol (max 10 chars)"),
        description: z
            .string()
            .optional()
            .describe("Token description"),
        reflection_bps: z
            .number()
            .int()
            .min(0)
            .max(5000)
            .optional()
            .describe("Reflection fee in basis points (default 500 = 5%)"),
        burn_bps: z
            .number()
            .int()
            .min(0)
            .max(5000)
            .optional()
            .describe("Burn fee in basis points (default 100 = 1%)"),
        creator_fee_bps: z
            .number()
            .int()
            .min(0)
            .max(5000)
            .optional()
            .describe("Creator fee in basis points (default 100 = 1%)"),
        creator_reflection_bps: z
            .number()
            .int()
            .min(0)
            .max(5000)
            .optional()
            .describe("Creator reflection share in basis points (default 100)"),
        image_url: z
            .string()
            .url()
            .optional()
            .describe("Existing image URL to use for the token"),
        image_base64: z
            .string()
            .optional()
            .describe("Base64-encoded image data (max 5MB)"),
        dalle_prompt: z
            .string()
            .optional()
            .describe("DALL-E prompt to generate token image"),
    },
}, async (params) => {
    if (!API_KEY) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        error: "DUMBMONEY_API_KEY not set. Set it as an environment variable to create tokens.",
                    }),
                },
            ],
            isError: true,
        };
    }
    try {
        const result = await postApi("/api/tokens/create", params);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Token creation failed";
        return {
            content: [{ type: "text", text: JSON.stringify({ error: message }) }],
            isError: true,
        };
    }
});
// Tool 6: Register as an agent
server.registerTool("register_agent", {
    description: "Register as a new agent on DumbMoney to get your own API key for creating tokens. The API key is shown only once - save it securely. No authentication required.",
    inputSchema: {
        name: z
            .string()
            .max(64)
            .describe("Agent name (e.g., 'my-trading-bot')"),
        description: z
            .string()
            .max(256)
            .optional()
            .describe("What this agent does"),
        fee_wallet: z
            .string()
            .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
            .optional()
            .describe("Optional Solana wallet address to receive creator fees from tokens you create"),
    },
}, async (params) => {
    try {
        const result = await postApi("/api/agents/register", params);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Registration failed";
        return {
            content: [{ type: "text", text: JSON.stringify({ error: message }) }],
            isError: true,
        };
    }
});
// Tool 7: Get your agent info
server.registerTool("get_my_agent_info", {
    description: "Get your agent profile, token creation count, and remaining rate limits. Requires DUMBMONEY_API_KEY to be set.",
    inputSchema: {},
}, async () => {
    if (!API_KEY) {
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        error: "DUMBMONEY_API_KEY not set. Register first with register_agent, then set the returned API key.",
                    }),
                },
            ],
            isError: true,
        };
    }
    try {
        const res = await fetch(`${BASE_URL}/api/agents/me`, {
            headers: { "X-API-Key": API_KEY },
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`API error ${res.status}: ${text}`);
        }
        const data = await res.json();
        return {
            content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get agent info";
        return {
            content: [{ type: "text", text: JSON.stringify({ error: message }) }],
            isError: true,
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("DumbMoney MCP server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
