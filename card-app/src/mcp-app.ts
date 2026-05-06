import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import "./global.css";
import "./card.css";

// --- Type definitions ---

interface PokemonData {
  name: string;
  id: number;
  height: number;
  weight: number;
  types: string[];
  abilities: string[];
  stats: Record<string, number>;
  imageUrl: string;
  flavorText?: string;
  category?: string;
}

// --- Type color map ---

const TYPE_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  fire:     { bg: "linear-gradient(145deg,#f97316,#dc2626)", text: "#fff", accent: "#fbbf24" },
  water:    { bg: "linear-gradient(145deg,#3b82f6,#1d4ed8)", text: "#fff", accent: "#93c5fd" },
  grass:    { bg: "linear-gradient(145deg,#22c55e,#15803d)", text: "#fff", accent: "#bbf7d0" },
  electric: { bg: "linear-gradient(145deg,#eab308,#ca8a04)", text: "#1a1a1a", accent: "#fef08a" },
  psychic:  { bg: "linear-gradient(145deg,#ec4899,#be185d)", text: "#fff", accent: "#fbcfe8" },
  ice:      { bg: "linear-gradient(145deg,#67e8f9,#0e7490)", text: "#1a1a1a", accent: "#cffafe" },
  dragon:   { bg: "linear-gradient(145deg,#7c3aed,#4c1d95)", text: "#fff", accent: "#c4b5fd" },
  dark:     { bg: "linear-gradient(145deg,#44403c,#1c1917)", text: "#fff", accent: "#a8a29e" },
  fairy:    { bg: "linear-gradient(145deg,#f9a8d4,#db2777)", text: "#1a1a1a", accent: "#fce7f3" },
  normal:   { bg: "linear-gradient(145deg,#a8a29e,#78716c)", text: "#fff", accent: "#e7e5e4" },
  fighting: { bg: "linear-gradient(145deg,#dc2626,#7f1d1d)", text: "#fff", accent: "#fca5a5" },
  flying:   { bg: "linear-gradient(145deg,#818cf8,#4338ca)", text: "#fff", accent: "#c7d2fe" },
  poison:   { bg: "linear-gradient(145deg,#a855f7,#6b21a8)", text: "#fff", accent: "#e9d5ff" },
  ground:   { bg: "linear-gradient(145deg,#d97706,#92400e)", text: "#fff", accent: "#fde68a" },
  rock:     { bg: "linear-gradient(145deg,#a16207,#713f12)", text: "#fff", accent: "#fef9c3" },
  bug:      { bg: "linear-gradient(145deg,#65a30d,#3f6212)", text: "#fff", accent: "#d9f99d" },
  ghost:    { bg: "linear-gradient(145deg,#6d28d9,#2e1065)", text: "#fff", accent: "#ddd6fe" },
  steel:    { bg: "linear-gradient(145deg,#94a3b8,#475569)", text: "#fff", accent: "#e2e8f0" },
};

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "ATK",
  defense: "DEF",
  "special-attack": "SpA",
  "special-defense": "SpD",
  speed: "SPD",
};

const STAT_COLORS: Record<string, string> = {
  hp: "#ef4444",
  attack: "#f97316",
  defense: "#eab308",
  "special-attack": "#8b5cf6",
  "special-defense": "#06b6d4",
  speed: "#22c55e",
};

// --- DOM refs ---

const loadingEl = document.getElementById("loading")!;
const errorEl = document.getElementById("error")!;
const errorMsgEl = document.getElementById("error-message")!;
const cardContainerEl = document.getElementById("card-container")!;
const cardEl = document.getElementById("pokemon-card")!;
const nameEl = document.getElementById("pokemon-name")!;
const categoryEl = document.getElementById("pokemon-category")!;
const hpEl = document.getElementById("pokemon-hp")!;
const typeRowEl = document.getElementById("type-row")!;
const imgEl = document.getElementById("pokemon-image") as HTMLImageElement;
const numberEl = document.getElementById("pokemon-number")!;
const dimsEl = document.getElementById("pokemon-dims")!;
const flavorEl = document.getElementById("flavor-text")!;
const statsGridEl = document.getElementById("stats-grid")!;
const abilitiesEl = document.getElementById("abilities-value")!;

// --- Helpers ---

function toTitleCase(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function showState(state: "loading" | "error" | "card") {
  loadingEl.classList.toggle("hidden", state !== "loading");
  errorEl.classList.toggle("hidden", state !== "error");
  cardContainerEl.classList.toggle("hidden", state !== "card");
}

function renderCard(pokemon: PokemonData) {
  const primaryType = pokemon.types[0] ?? "normal";
  const theme = TYPE_COLORS[primaryType] ?? TYPE_COLORS.normal!;

  // Apply card color theme
  cardEl.style.setProperty("--card-bg", theme.bg);
  cardEl.style.setProperty("--card-text", theme.text);
  cardEl.style.setProperty("--card-accent", theme.accent);

  // Header
  nameEl.textContent = toTitleCase(pokemon.name);
  categoryEl.textContent = pokemon.category ? `The ${pokemon.category}` : "";
  hpEl.textContent = String(pokemon.stats.hp ?? "—");

  // Types
  typeRowEl.innerHTML = pokemon.types
    .map(t => `<span class="type-badge type-${t}">${toTitleCase(t)}</span>`)
    .join("");

  // Image
  imgEl.src = pokemon.imageUrl;
  imgEl.alt = toTitleCase(pokemon.name);

  // Number + dimensions
  numberEl.textContent = `#${String(pokemon.id).padStart(3, "0")}`;
  const heightM = (pokemon.height * 0.1).toFixed(1);
  const weightKg = (pokemon.weight * 0.1).toFixed(1);
  dimsEl.textContent = `${heightM}m · ${weightKg}kg`;

  // Flavor text
  flavorEl.textContent = pokemon.flavorText ?? "";
  flavorEl.classList.toggle("hidden", !pokemon.flavorText);

  // Stats
  statsGridEl.innerHTML = "";
  for (const [key, label] of Object.entries(STAT_LABELS)) {
    const value = pokemon.stats[key] ?? 0;
    const pct = Math.min(100, Math.round((value / 255) * 100));
    const color = STAT_COLORS[key] ?? "#6b7280";
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `
      <span class="stat-label">${label}</span>
      <span class="stat-value">${value}</span>
      <div class="stat-bar-track">
        <div class="stat-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    `;
    statsGridEl.appendChild(row);
  }

  // Abilities
  abilitiesEl.textContent = pokemon.abilities.map(toTitleCase).join(", ");

  showState("card");
}

// --- App setup ---

function handleHostContext(ctx: McpUiHostContext) {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
}

const mcpApp = new App({ name: "Pokemon Card App", version: "1.0.0" });

mcpApp.onteardown = async () => ({});
mcpApp.onerror = console.error;
mcpApp.onhostcontextchanged = handleHostContext;

mcpApp.ontoolinput = () => {
  showState("loading");
};

mcpApp.ontoolresult = (result: CallToolResult) => {
  if (result.isError) {
    const msg = result.content.find(c => c.type === "text")?.text ?? "Unknown error";
    errorMsgEl.textContent = msg;
    showState("error");
    return;
  }
  const pokemon = result.structuredContent as unknown as PokemonData;
  if (!pokemon?.name) {
    errorMsgEl.textContent = "Received unexpected data from server";
    showState("error");
    return;
  }
  renderCard(pokemon);
};

mcpApp.connect().then(() => {
  const ctx = mcpApp.getHostContext();
  if (ctx) handleHostContext(ctx);
});
