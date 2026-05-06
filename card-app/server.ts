import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const ARTWORK_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork";

const PokemonSchema = z.object({
  name: z.string(),
  id: z.number(),
  height: z.number(),
  weight: z.number(),
  types: z.array(z.string()),
  abilities: z.array(z.string()),
  stats: z.record(z.string(), z.number()),
  imageUrl: z.string(),
  flavorText: z.string().optional(),
  category: z.string().optional(),
});

export type PokemonData = z.infer<typeof PokemonSchema>;

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Pokemon Card MCP App Server",
    version: "1.0.0",
  });

  const resourceUri = "ui://pokemon-card/mcp-app.html";

  registerAppTool(
    server,
    "get_pokemon_info",
    {
      title: "Get Pokemon Info",
      description: "Fetches Pokemon data and displays it as a graphical trading card.",
      inputSchema: {
        pokemon_name: z.string().describe("Name or Pokedex number of the Pokemon (e.g. 'pikachu' or '25')"),
      },
      outputSchema: PokemonSchema,
      _meta: { ui: { resourceUri } },
    },
    async ({ pokemon_name }): Promise<CallToolResult> => {
      try {
        const slug = pokemon_name.toLowerCase().trim();
        const data = await fetchJson(`${POKEAPI_BASE}/pokemon/${slug}`) as Record<string, unknown>;

        const id = data.id as number;
        const name = data.name as string;
        const height = data.height as number;
        const weight = data.weight as number;

        const types = (data.types as Array<{ type: { name: string } }>)
          .map(t => t.type.name);
        const abilities = (data.abilities as Array<{ ability: { name: string } }>)
          .map(a => a.ability.name);
        const stats: Record<string, number> = {};
        for (const s of data.stats as Array<{ stat: { name: string }; base_stat: number }>) {
          stats[s.stat.name] = s.base_stat;
        }

        const imageUrl = `${ARTWORK_BASE}/${id}.png`;

        // Fetch species for flavor text and category
        let flavorText: string | undefined;
        let category: string | undefined;
        try {
          const speciesData = await fetchJson(`${POKEAPI_BASE}/pokemon-species/${id}`) as Record<string, unknown>;
          const englishFlavor = (speciesData.flavor_text_entries as Array<{ flavor_text: string; language: { name: string }; version: { name: string } }>)
            .find(e => e.language.name === "en");
          if (englishFlavor) {
            flavorText = englishFlavor.flavor_text.replace(/\f/g, " ").replace(/\n/g, " ");
          }
          const englishGenus = (speciesData.genera as Array<{ genus: string; language: { name: string } }>)
            .find(g => g.language.name === "en");
          if (englishGenus) {
            category = englishGenus.genus;
          }
        } catch {
          // Species data is bonus — don't fail if unavailable
        }

        const pokemon: PokemonData = { name, id, height, weight, types, abilities, stats, imageUrl, flavorText, category };

        return {
          content: [{ type: "text", text: `${name} (#${id}) — ${types.join("/")} type` }],
          structuredContent: pokemon,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          isError: true,
          content: [{ type: "text", text: `Failed to fetch Pokemon: ${message}` }],
        };
      }
    },
  );

  registerAppResource(
    server,
    "Pokemon Card UI",
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(DIST_DIR, "mcp-app.html"), "utf-8");
      return {
        contents: [
          {
            uri: resourceUri,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: {
              ui: {
                csp: {
                  // Pokemon official artwork is hosted on GitHub's raw CDN
                  resourceDomains: ["https://raw.githubusercontent.com"],
                },
              },
            },
          },
        ],
      };
    },
  );

  return server;
}
