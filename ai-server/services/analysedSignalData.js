import 'dotenv/config'; // automatically loads .env
import { sqlConfig } from '../utils/utils.js';
import sql from 'mssql';

// import sql from 'mssql/msnodesqlv8.js';

// const sqlConfig = {
//     driver: 'msnodesqlv8',
//     connectionString: `Server=asset-sql,1433;Database=TmindDB2Asset;User Id=sa;Password=${process.env.SQL_SERVER_PASSWORD};TrustServerCertificate=True;`
// };



async function executeSql(sqlQuery) {
    let pool;
    try {
        pool = await sql.connect(sqlConfig);
        const result = await pool.request().query(sqlQuery);
        return result.recordset;
    } finally {
        if (pool) await pool.close();
    }
}



export function getThresholdViolations(data) {
    if (!data || !data.cleanedSignals) return [];

    return data.cleanedSignals.filter(signal => {
        return signal.value < signal.minThreshold || signal.value > signal.maxThreshold;
    });
}




async function getAssetNames(assetIds) {
    if (!assetIds.length) return {};
    const ids = assetIds.map(id => `'${id}'`).join(',');
    const query = `SELECT AssetId, Name as AssetName FROM Assets WHERE AssetId IN (${ids})`;
    const rows = await executeSql(query);
    const map = {};
    rows.forEach(r => map[r.AssetId.toLowerCase()] = r.AssetName);
    return map;
}


export async function enrichSignalData2(signalData, maxRows = 100) {

  if (!signalData || !signalData.length) return [];


  // Get unique assetIds
  const assetIds = [...new Set(signalData.map(d => d.assetId.toLowerCase()))];

  // Fetch asset names from SQL
  const assetMap = await getAssetNames(assetIds);


  // Enrich rows
  const enriched = signalData
    .map(d => ({
      assetName: assetMap[d.assetId.toLowerCase()] || 'Unknown Asset',
      ...d
    }))
    .sort((a, b) => a.timeMs - b.timeMs);

  // Return as-is if <= maxRows

  if (enriched.length <= maxRows) return enriched;


  // Aggregate smartly
  const startTime = enriched[0].timeMs;
  const endTime = enriched[enriched.length - 1].timeMs;
  const intervalMs = (endTime - startTime) / maxRows;

  const aggregated = [];
  let bucket = [];
  let bucketStart = startTime;

  const aggregateBucket = arr => {
    if (!arr.length) return null;
    const signalsGrouped = {};
    arr.forEach(s => {
      if (!signalsGrouped[s.signalTypeId]) signalsGrouped[s.signalTypeId] = [];
      signalsGrouped[s.signalTypeId].push(s);
    });

    const aggRows = [];
    for (const signalTypeId in signalsGrouped) {
      const group = signalsGrouped[signalTypeId];
      const avgValue = group.reduce((sum, s) => sum + s.value, 0) / group.length;
      const minTime = new Date(Math.min(...group.map(s => s.timeMs)));
      const maxTime = new Date(Math.max(...group.map(s => s.timeMs)));

      aggRows.push({
        assetId: group[0].assetId,
        assetName: group[0].assetName,
        signalTypeId,
        signalName: group[0].signalName,
        value: avgValue,
        unit: group[0].unit,
        minThreshold: group[0].minThreshold,
        maxThreshold: group[0].maxThreshold,
        aggregatedFrom: minTime.toISOString(),
        aggregatedTo: maxTime.toISOString(),
      });
    }
    return aggRows;
  };

  for (const row of enriched) {
    if (row.timeMs < bucketStart + intervalMs) {
      bucket.push(row);
    } else {
      const agg = aggregateBucket(bucket);
      if (agg) aggregated.push(...agg);
      bucket = [row];
      bucketStart += intervalMs;
    }
  }
  const lastAgg = aggregateBucket(bucket);
  if (lastAgg) aggregated.push(...lastAgg);

  return aggregated;
}



/**
 * Normalize flat telemetry rows into LLM-ready asset → signal hierarchy
 */
export function getDataForLLM(flatData = []) {
  if (!Array.isArray(flatData) || flatData.length === 0) {
    return { assets: {} };
  }

  const result = { assets: {} };

  /* ------------------------- helpers ------------------------- */

  function ensureSignal(assetName, signalName, unit, minT, maxT) {
    if (!result.assets[assetName]) {
      result.assets[assetName] = { signals: {} };
    }

    const signals = result.assets[assetName].signals;

    if (!signals[signalName]) {
      signals[signalName] = {
        unit: unit ?? null,
        minThreshold: typeof minT === 'number' ? minT : null,
        maxThreshold: typeof maxT === 'number' ? maxT : null,
        values: [],
        aggregated: []
      };
    } else {
      // backfill metadata if missing
      if (!signals[signalName].unit && unit) signals[signalName].unit = unit;
      if (signals[signalName].minThreshold == null && typeof minT === 'number')
        signals[signalName].minThreshold = minT;
      if (signals[signalName].maxThreshold == null && typeof maxT === 'number')
        signals[signalName].maxThreshold = maxT;
    }

    return signals[signalName];
  }

  /**
   * Parse time safely:
   * - ISO string
   * - epoch ms
   * - IST string: "DD/MM/YYYY HH:mm:ss"
   */
  function parseToIso(time) {
    if (!time) return null;

    if (typeof time === 'number') {
      const d = new Date(time);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }

    if (typeof time === 'string') {
      // ISO or browser-parseable
      const isoTry = new Date(time);
      if (!isNaN(isoTry.getTime())) return isoTry.toISOString();

      // IST: "15/12/2025 13:59:54"
      const m = time.match(
        /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/
      );
      if (m) {
        const [, dd, mm, yyyy, hh, mi, ss] = m.map(Number);
        const d = new Date(yyyy, mm - 1, dd, hh, mi, ss);
        return isNaN(d.getTime()) ? null : d.toISOString();
      }
    }

    return null;
  }

  /* ------------------------- ingest ------------------------- */

  for (const item of flatData) {
    const {
      assetName = 'unknown',
      signalName: rawSignalName,
      signalTypeId,
      unit,
      minThreshold,
      maxThreshold,
      value,
      timeIst,
      timeIstIso,
      aggregatedFrom,
      aggregatedTo,
      min: aggMin,
      max: aggMax,
      average: aggAvg
    } = item;

    const signalName = rawSignalName || signalTypeId || 'unknown';

    const signal = ensureSignal(
      assetName,
      signalName,
      unit,
      minThreshold,
      maxThreshold
    );

    // aggregated row
    if (aggregatedFrom || aggregatedTo) {
      const repTime = parseToIso(aggregatedFrom || aggregatedTo);
      let repValue = null;

      if (typeof aggAvg === 'number') repValue = aggAvg;
      else if (typeof value === 'number') repValue = value;
      else if (typeof aggMin === 'number' && typeof aggMax === 'number') {
        repValue = (aggMin + aggMax) / 2;
      }

      if (repTime && repValue != null) {
        signal.values.push({ time: repTime, value: Number(repValue) });
      }
      continue;
    }

    // raw telemetry row
    const isoTime = parseToIso(timeIstIso || timeIst);
    if (isoTime && typeof value === 'number') {
      signal.values.push({ time: isoTime, value: Number(value) });
    }
  }

  /* ------------------- normalize + aggregate ------------------- */

  for (const asset of Object.values(result.assets)) {
    for (const signal of Object.values(asset.signals)) {
      // dedupe
      const seen = new Set();
      signal.values = signal.values
        .filter(v => v && v.time && !isNaN(v.value))
        .filter(v => {
          const k = `${v.time}|${v.value}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .sort((a, b) => new Date(a.time) - new Date(b.time));

      if (signal.values.length === 0) continue;

      const vals = signal.values.map(v => v.value);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const avg = Number(
        (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)
      );

      signal.aggregated = [
        {
          from: signal.values[0].time,
          to: signal.values[signal.values.length - 1].time,
          min,
          max,
          average: avg
        }
      ];
    }
  }

  return result;
}














