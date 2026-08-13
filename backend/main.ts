import { Agent } from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";
import { StrandsAgent } from "@ag-ui/aws-strands";
import { createStrandsApp } from "@ag-ui/aws-strands/server";
import { tool } from "@strands-agents/sdk";
import {z} from 'zod';

/** What the published `WeatherResult` interface says a reading looks like. */
export interface WeatherReading {
  city: string;
  temperature: number;
  humidity: number;
  wind_speed: number;
  conditions: string;
}

const CONDITIONS = [
  "Clear",
  "Partly cloudy",
  "Overcast",
  "Light rain",
  "Heavy rain",
  "Thunderstorms",
  "Snow",
  "Fog",
] as const;

/**
 * Stable hash of the location string.
 *
 * `Math.random()` would make the card change on every re-render during
 * streaming, which reads as a bug rather than a fixture. This keeps one city
 * pinned to one reading for the life of the repo.
 */
function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}


export function getWeatherImpl(location: string): WeatherReading {
  const city = location.trim() || "Unknown";
  const seed = hash(city.toLowerCase());

  return {
    city,
    temperature: 50,
    humidity: 30,
    wind_speed: 20,
    conditions: "Sunny",
  };
}

export const getWeather = tool({
  name: "get_weather",
  description: "Get current weather for a location.",
  inputSchema: z.object({
    location: z.string().describe("The location to get weather for."),
  }),
  callback: ({ location }) => JSON.stringify(getWeatherImpl(location)),
});

// Setup your Strands agent
const model = new OpenAIModel({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  modelId: "gpt-5.4",
});

const agent = new Agent({
  model,
  systemPrompt: "You are a helpful AI assistant.",
  tools: [getWeather]
});

await agent.initialize();

// Wrap with AG-UI integration
const aguiAgent = new StrandsAgent({
  agent,
  name: "strands_agent",
});

// Create the Express app
const app = await createStrandsApp(aguiAgent, { path: "/" });

app.listen(8000, () => {
  console.log("Agent listening on http://localhost:8000");
});