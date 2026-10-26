import { StateGraph } from "@langchain/langgraph";
import {
  buildObservations,
  correlateSignals,
  searchHistoricalRCA
} from "../utils/utils.js";
import { generateRCAWithLLM } from "./GroqLLMService.js";

const graph = new StateGraph({
  channels: {
    input: {},
    userQuery: {},
    observations: {},
    correlations: {},
    historyMatches: {},
    finalRCA: {}
  }
});

// 1️⃣ Build observations
graph.addNode("observe", async (state) => {
  const obs = buildObservations(
    Object.values(state.input.assets)[0]
  );

  return {
    observations: obs
  };
});


// 2️⃣ Correlate signals
graph.addNode("correlate", async (state) => {
  return {
    correlations: correlateSignals(state.observations.flags || [])
  };
});


// 3️⃣ Fetch historical RCA matches
graph.addNode("fetchHistory", async (state) => {

  return {
    historyMatches: await searchHistoricalRCA(
      (state.observations.observations || []).join(" ")
    )

  };
});


// 4️⃣ Generate LLM explanation
graph.addNode("llm", async (state) => {

  const explanation = await generateRCAWithLLM(state);

  return {
    finalRCA: explanation.explanation || explanation
  };
});


// 🔗 Graph flow
graph.addEdge("observe", "correlate");
graph.addEdge("correlate", "fetchHistory");
graph.addEdge("fetchHistory", "llm");

graph.setEntryPoint("observe");

export const rcaGraph = graph.compile();
