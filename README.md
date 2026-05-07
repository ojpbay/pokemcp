# PokeMCP

## MCP server for retrieving Pokemon data

MCP server for retrieving Pokemon data. Inspired by [Building an MCP server in 2 minutes](https://www.youtube.com/watch?v=Fhy_VFMlE9s)

run with

```
.\.venv\Scripts\activate
mcp dev poke.py
```

## MCP server and app

To install the MCP server with Claude run the following

```
claude mcp add pokemon-card -- npx tsx g:\Repos\pokemcp\card-app\main.ts --stdio
```

Then run with

```
cd card-app
npm install
npm start
```
