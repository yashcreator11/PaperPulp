import 'dotenv/config'; // loads environment variables
import { InfluxDB } from '@influxdata/influxdb-client';
import * as groqService from './groq.service.js'; // note the .js extension

const influxClient = new InfluxDB({ 
  url: process.env.INFLUX_URL, 
  token: process.env.INFLUX_TOKEN 
});
const queryApi = influxClient.getQueryApi(process.env.INFLUX_ORG);

/**
 * Convert user query to Flux using LLM
 * @param {string} userQuery
 * @returns {Promise<string>} Flux query
 */
async function generateFluxQuery(userQuery) {
  const systemPrompt = `
You are an expert in InfluxDB Flux query language. 
Take user queries like "Get last 7 days temperature of Engine2" 
and convert them into a valid InfluxDB Flux query. 

Use the bucket "${process.env.INFLUX_BUCKET}" and include only "_time" and "_value". 
Respond ONLY with JSON like: {"flux": "<flux_query_here>"}

Examples:

Input: "Get last 7 days temperature of Engine2"
Output: {"flux": "from(bucket: \\"SignalValueTeleMentry\\") |> range(start: -7d) |> filter(fn: (r) => r.assetId == \\"Engine2\\" && r._field == \\"value\\") |> keep(columns: [\\"_time\\", \\"_value\\"]) |> sort(columns: [\\"_time\\"], desc: false)"}

Input: "Give me all data"
Output: {"flux": null, "error": "Query too broad, please specify asset and time"}
`;

  const llmResp = await groqService.chatWithGroq(userQuery, systemPrompt);

  const text = llmResp.choices?.[0]?.message?.content || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);

  if (!jsonMatch) throw new Error('LLM did not return valid JSON');

  const obj = JSON.parse(jsonMatch[0]);
  if (!obj.flux) throw new Error(obj.error || 'Flux query could not be generated');

  return obj.flux;
}

/**
 * Execute Flux query in InfluxDB
 * @param {string} flux
 * @returns {Promise<Array<{time: string, value: number}>>}
 */
async function executeFluxQuery(flux) {
  const result = [];
  console.log("Executing Flux Query:", flux);
  const tables = await queryApi.collectRows(flux, {
    rowMapper: row => ({ time: row._time, value: row._value })
  });

  return tables;
}

/**
 * Main function: validate → generate Flux → execute → return data
 * @param {string} userQuery
 */
async function getTelemetryFromUserQuery(userQuery) {
  try {
    // 1️⃣ Validate query using LLM
    const validationPrompt = `
You are an RCA assistant. 
Determine if the user query is valid (has asset & time). 
Respond ONLY with JSON: {"valid": true/false, "reason": "..."}.
User Query: "${userQuery}"
`;
    const validationResp = await groqService.chatWithGroq(userQuery, validationPrompt);
    const validationText = validationResp.choices?.[0]?.message?.content || '';
    const jsonMatch = validationText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON from validator');
    const { valid, reason } = JSON.parse(jsonMatch[0]);
    if (!valid) throw new Error(reason);

    // 2️⃣ Generate Flux query
    const flux = await generateFluxQuery(userQuery);

    // 3️⃣ Execute query
    const data = await executeFluxQuery(flux);

    return data;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

export default  { getTelemetryFromUserQuery };
