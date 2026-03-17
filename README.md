# Octant Copilot

An embeddable AI-powered chat widget that helps users discover and donate to projects on [Octant](https://octant.app). Users describe their values or interests in natural language, and the copilot searches Octant in real time and returns personalized project recommendations.

## Quick Start

```bash
# Install dependencies
cd widget && npm install

# Set your API key
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Build the widget
npm run build

# Run the API proxy locally
cd .. && npx vercel dev

# Open demo/index.html in your browser
```

## Embedding

Add a single script tag to any page:

```html
<script src="https://your-deploy-url.vercel.app/widget.js" defer></script>
```

Optional configuration:

```html
<script>
  window.OctantCopilotConfig = {
    accentColor: "#00d4aa",
    position: "bottom-right",
    apiUrl: "https://your-deploy-url.vercel.app/api/chat"
  };
</script>
<script src="https://your-deploy-url.vercel.app/widget.js" defer></script>
```

## Deployment

```bash
npx vercel --prod
```

Set `OPENAI_API_KEY` in the Vercel project environment variables.

## Architecture

- **widget/** — Vanilla JS chat widget, built with Vite into a single `widget.js` (IIFE)
- **api/chat.js** — Vercel serverless function that proxies requests to the OpenAI Responses API with web search
- **demo/** — Local test page for the embedded widget
