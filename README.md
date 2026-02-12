# DumbMoney MCP Server

MCP (Model Context Protocol) server for [DumbMoney](https://dumbmoney.win) — query reflection tokens, check earnings, and discover top earners on Solana.

## Tools

| Tool | Description |
|------|-------------|
| `list_tokens` | List all reflection tokens with price, market cap, and bonding curve progress |
| `get_token` | Get detailed info about a specific token by mint address |
| `check_earnings` | Check a wallet's pending reflection earnings for a token |
| `top_earners` | Get the top 10 tokens by total reflections paid |

## Usage with Claude Code

Add to your `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "dumbmoney": {
      "command": "npx",
      "args": ["@dumbmoney/mcp-server"]
    }
  }
}
```

## Usage with Claude Desktop

Add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "dumbmoney": {
      "command": "npx",
      "args": ["@dumbmoney/mcp-server"]
    }
  }
}
```

## Build from source

```bash
cd mcp-server
npm install
npm run build
npm start
```
