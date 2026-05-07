import httpx
from mcp.server.fastmcp import FastMCP

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
async def get_pokemon_info(pokemon_name: str) -> str:    
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
        return f"""
    Name: {info['name']}
    ID: {info['id']}
    Height: {info['height']}
    Weight: {info['weight']}
    Stats: {', '.join([f'{k}: {v}' for k, v in info['stats'].items()])}
    Abilities: {', '.join(info['abilities'])}  
    Types: {', '.join(info['types'])}
    """
        
# --- entry point for testing ---
if __name__ == "__main__":
    mcp.run(transport="stdio")