import httpx
from mcp.server.fastmcp import FastMCP
from mcp import types

mcp = FastMCP("poke")

POKEAPI_BASE_URL = "https://pokeapi.co/api/v2"

async def fetch_pokemon_data(pokemon_name: str) -> dict:
    url = f"{POKEAPI_BASE_URL}/pokemon/{pokemon_name.lower()}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        if response.status_code == 200:
            return response.json()
        else:
            raise ValueError(f"Pokémon '{pokemon_name}' not found.")
        
@mcp.tool()
async def get_pokemon_info(pokemon_name: str) -> types.ToolResponse:
    try:
        data = await fetch_pokemon_data(pokemon_name)
        if not data:
            raise ValueError(f"Pokémon '{pokemon_name}' not found.")
                                
        info = {
            "name": data["name"],
            "id": data["id"],
            "height": data["height"],
            "weight": data["weight"],
            "stats": {s["stat"]["name"]: s["base_stat"] for s in data["stats"]},
            "abilities": [a["ability"]["name"] for a in data["abilities"]],
            "types": [t["type"]["name"] for t in data["types"]],
        }
        return types.ToolResponse(success=True, data=info)
    except ValueError as e:
        return types.ToolResponse(success=False, error=str(e))
    
@mcp.tool()
async def get_pokemon_abilities(pokemon_name: str) -> types.ToolResponse:
    try:
        data = await fetch_pokemon_data(pokemon_name)
        abilities = [a["ability"]["name"] for a in data["abilities"]]
        return types.ToolResponse(success=True, data=abilities)
    except ValueError as e:
        return types.ToolResponse(success=False, error=str(e))
    
@mcp.tool()
async def get_pokemon_stats(pokemon_name: str) -> types.ToolResponse:
    try:
        data = await fetch_pokemon_data(pokemon_name)
        stats = {s["stat"]["name"]: s["base_stat"] for s in data["stats"]}
        return types.ToolResponse(success=True, data=stats)
    except ValueError as e:
        return types.ToolResponse(success=False, error=str(e))  
    
@mcp.tool()
async def list_popular_pokemon(limit: int = 10) -> types.ToolResponse:
    url = f"{POKEAPI_BASE_URL}/pokemon?limit={limit}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        if response.status_code == 200:
            data = response.json()
            pokemon_list = [p["name"] for p in data["results"]]
            return types.ToolResponse(success=True, data=pokemon_list)
        else:
            return types.ToolResponse(success=False, error="Failed to fetch popular Pokémon.")
        
# --- entry point for testing ---
if __name__ == "__main__":
    mcp.run(transport="stdio")