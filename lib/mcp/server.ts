import { z } from "zod";

export type McpToolName =
  | "search_web"
  | "get_weather"
  | "get_visa_info"
  | "get_esim_plans"
  | "search_flights"
  | "get_fuel_prices"
  | "save_memory"
  | "get_memories"
  | "create_project"
  | "calculate"
  | "get_exchange_rates"
  | "build_website";

export type McpToolDefinition<TSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
  name: McpToolName;
  description: string;
  inputSchema: Record<string, unknown>;
  schema: TSchema;
  uiLabel: string;
};

function defineTool<TSchema extends z.ZodTypeAny>(
  name: McpToolName,
  uiLabel: string,
  description: string,
  schema: TSchema,
  inputSchema: Record<string, unknown>
): McpToolDefinition<TSchema> {
  return {
    name,
    uiLabel,
    description,
    schema,
    inputSchema
  };
}

export const toolDefinitions = [
  defineTool(
    "search_web",
    "Web search",
    "Search the internet for current, real-time information about any topic.",
    z.object({
      query: z.string().min(2)
    }),
    {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The exact search query to run."
        }
      },
      required: ["query"]
    }
  ),
  defineTool(
    "get_weather",
    "Weather",
    "Get current weather and a short forecast for any city or location.",
    z.object({
      location: z.string().min(2)
    }),
    {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "City or location to look up."
        }
      },
      required: ["location"]
    }
  ),
  defineTool(
    "get_visa_info",
    "Visa information",
    "Get visa requirements, processing time, and costs for visiting a country.",
    z.object({
      destination: z.string().min(2),
      passport_country: z.string().min(2)
    }),
    {
      type: "object",
      properties: {
        destination: {
          type: "string",
          description: "Country being visited."
        },
        passport_country: {
          type: "string",
          description: "Country of the traveler's passport."
        }
      },
      required: ["destination", "passport_country"]
    }
  ),
  defineTool(
    "get_esim_plans",
    "eSIM plans",
    "Get available eSIM data plans for travelling to a specific country.",
    z.object({
      country: z.string().min(2)
    }),
    {
      type: "object",
      properties: {
        country: {
          type: "string",
          description: "Destination country for the eSIM search."
        }
      },
      required: ["country"]
    }
  ),
  defineTool(
    "search_flights",
    "Flight search",
    "Search for available flights between two cities on a specific date.",
    z.object({
      from: z.string().min(2),
      to: z.string().min(2),
      date: z.string().min(4),
      passengers: z.number().int().positive().optional()
    }),
    {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Departure city or airport."
        },
        to: {
          type: "string",
          description: "Arrival city or airport."
        },
        date: {
          type: "string",
          description: "Travel date in a user-friendly format."
        },
        passengers: {
          type: "number",
          description: "Optional passenger count."
        }
      },
      required: ["from", "to", "date"]
    }
  ),
  defineTool(
    "get_fuel_prices",
    "Fuel prices",
    "Get current petrol and diesel fuel prices in a country.",
    z.object({
      country: z.string().min(2)
    }),
    {
      type: "object",
      properties: {
        country: {
          type: "string",
          description: "Country to check fuel prices for."
        }
      },
      required: ["country"]
    }
  ),
  defineTool(
    "save_memory",
    "Save memory",
    "Save important information to the user's Xeivora memory for future conversations.",
    z.object({
      title: z.string().min(2),
      content: z.string().min(2),
      category: z.string().optional()
    }),
    {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short label for the memory."
        },
        content: {
          type: "string",
          description: "What should be remembered."
        },
        category: {
          type: "string",
          description: "Optional memory category."
        }
      },
      required: ["title", "content"]
    }
  ),
  defineTool(
    "get_memories",
    "Get memories",
    "Retrieve relevant memories from the user's saved context.",
    z.object({
      query: z.string().optional()
    }),
    {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Optional search query for relevant memories."
        }
      }
    }
  ),
  defineTool(
    "create_project",
    "Create project",
    "Create a new Xeivora project to organise related chats, files, and workflows.",
    z.object({
      name: z.string().min(2),
      description: z.string().min(2)
    }),
    {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Project name."
        },
        description: {
          type: "string",
          description: "Short description of the project."
        }
      },
      required: ["name", "description"]
    }
  ),
  defineTool(
    "calculate",
    "Calculator",
    "Perform mathematical calculations, unit conversions, and currency conversions.",
    z.object({
      expression: z.string().min(1)
    }),
    {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "Math expression or conversion request."
        }
      },
      required: ["expression"]
    }
  ),
  defineTool(
    "get_exchange_rates",
    "Exchange rates",
    "Get current currency exchange rates between two currencies.",
    z.object({
      from: z.string().min(3).max(3),
      to: z.string().min(3).max(3),
      amount: z.number().positive().optional()
    }),
    {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Base currency code, for example GBP."
        },
        to: {
          type: "string",
          description: "Target currency code, for example USD."
        },
        amount: {
          type: "number",
          description: "Optional amount to convert."
        }
      },
      required: ["from", "to"]
    }
  ),
  defineTool(
    "build_website",
    "Build website",
    "Generate a complete website based on a description and deploy it.",
    z.object({
      description: z.string().min(10),
      style: z.string().optional(),
      pages: z.array(z.string()).optional()
    }),
    {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Detailed website request."
        },
        style: {
          type: "string",
          description: "Optional visual style direction."
        },
        pages: {
          type: "array",
          items: {
            type: "string"
          },
          description: "Optional page list."
        }
      },
      required: ["description"]
    }
  )
] as const satisfies readonly McpToolDefinition[];

export const toolsArray = toolDefinitions.map((tool) => ({
  name: tool.name,
  description: tool.description,
  input_schema: tool.inputSchema
}));

export const toolMap = Object.fromEntries(
  toolDefinitions.map((tool) => [tool.name, tool])
) as unknown as Record<McpToolName, McpToolDefinition>;

export function getToolDefinition(name: string) {
  return toolMap[name as McpToolName] ?? null;
}

export function listToolNames() {
  return toolDefinitions.map((tool) => tool.name);
}

export async function createXeivoraMcpServer() {
  const sdk: any = await import("@modelcontextprotocol/sdk/server/mcp.js");
  const server = new sdk.McpServer({
    name: "xeivora-mcp",
    version: "0.1.0"
  });

  for (const tool of toolDefinitions) {
    if (typeof server.registerTool === "function") {
      server.registerTool(
        tool.name,
        {
          description: tool.description,
          inputSchema: tool.schema
        },
        async () => ({
          content: [
            {
              type: "text",
              text: `${tool.name} is executed inside the Xeivora runtime.`
            }
          ]
        })
      );
      continue;
    }

    if (typeof server.tool === "function") {
      server.tool(tool.name, tool.description, tool.schema, async () => ({
        content: [
          {
            type: "text",
            text: `${tool.name} is executed inside the Xeivora runtime.`
          }
        ]
      }));
    }
  }

  return server;
}
