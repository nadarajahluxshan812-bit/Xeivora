# Xeivora MCP Progress

This folder contains the saved partial MCP/tooling work for Xeivora.

## Saved so far

- `server.ts`
  - MCP tool registry
  - tool names and UI labels
  - zod schemas
  - JSON input schemas
  - exported tool definitions / array
- `detector.ts`
  - `likelyNeedsTool(message)` heuristic for routing likely tool requests
- `package.json`
  - added `@modelcontextprotocol/sdk`
  - added `zod`
- `.env.example`
  - added MCP-related environment placeholders

## Finished in this pass

- `lib/mcp/executor.ts`
  - validates planned tool calls
  - wraps the existing workspace tool layer
  - runs MCP tools with timeouts
  - returns normalized UI-friendly execution results
  - logs MCP tool executions to workspace telemetry
- Runtime integration
  - `lib/server/ai-runtime.js` now calls the MCP executor
  - current lightweight tool behavior is preserved through the wrapper
  - both normal utility responses and streaming chat now use the same MCP path
- API / SSE integration
  - tool executions are emitted through the real streaming session route as `tool` events
  - `/api/tools/execute` now uses the MCP executor too
- Chat UI integration
  - `/chat` renders tool usage/result cards above the assistant response
  - existing continuity banners, fallback handling, and message flow are preserved
- Validation
  - targeted lint passed
  - production `npm run build` passed in the clean deploy clone

## Remaining future work

- richer visual treatment for tool cards in `/chat`
- more real connected handlers for travel/search/exchange-rate MCP tools
- optional persistence of tool cards inside stored message payloads if long-term replay is needed

## Important note

The real live chat path in Xeivora is the streaming session endpoint:

- `app/api/chat/sessions/[sessionId]/stream/route.ts`

So MCP must be wired there, not only into the simpler `/api/chat` route.

## Recommended next step

1. Connect more MCP tools to live providers and APIs
2. Add richer inline tool result rendering or replay persistence if needed
3. Expand tool routing beyond the current heuristics when the product spec needs it
