import { CORRELATION_RULES } from "../coRelationalRules.js";
import { embedText } from "../vectorDB/embedding.js";
import { COLLECTION, qdrant } from "../vectorDB/qdrantClient.js";

/**
 * Robust extractor — returns results with local India time (IST) fields.
 * - Accepts array or { fluxRaw: [...] } or { influxData: [...] }
 * - Adds: timeIst (human), timeIstIso (ISO-like with +05:30), timeMs (unix ms)
 *
 * opts:
 *  - timeWindowMs: number (default 1000)
 *  - mode: "all" | "latest" | "merge-avg"  (default "all")
 */
export function extractSignalValues(input, opts = {}) {
  const timeWindowMs = typeof opts.timeWindowMs === 'number' ? opts.timeWindowMs : 1000;
  const mode = typeof opts.mode === 'string' ? opts.mode : 'all'; // 'all'|'latest'|'merge-avg'

  // quick guard
  if (!input) return [];

  // normalize input shapes
  let fluxRaw = null;
  if (Array.isArray(input)) fluxRaw = input;
  else if (Array.isArray(input.fluxRaw)) fluxRaw = input.fluxRaw;
  else if (Array.isArray(input.influxData)) fluxRaw = input.influxData;
  else return [];

  const signalDefinitions = [
    { name: "Current", unit: "A", max: 50, min: 0 },
    { name: "Voltage", unit: "V", max: 26, min: 18 },
    { name: "FlowRate", unit: "L/min", max: 200, min: 1 },
    { name: "Temperature", unit: "°C", max: 80, min: -10 },
    { name: "RPM", unit: "rpm", max: 600, min: 100 },
    { name: "Torque", unit: "Nm", max: 500, min: 0 },
    { name: "Vibration", unit: "mm/s", max: 10, min: 0 },
    { name: "Frequency", unit: "Hz", max: 65, min: 45 }
  ];

  const isNumeric = (v) => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v));
  const findDef = (signalName) =>
    signalDefinitions.find(s => (s.name || '').toLowerCase() === (signalName || '').toLowerCase());

  const unitEntriesMap = new Map(); // key: assetId|signalTypeId -> [{timeMs, unit}, ...]
  const valueEntries = []; // raw numeric entries

  const buildIdxToLabel = (tableMeta) => {
    const map = {};
    if (!tableMeta || !Array.isArray(tableMeta.columns)) return map;
    tableMeta.columns.forEach((col) => {
      if (col && typeof col.index === 'number' && col.label) map[col.index] = col.label;
    });
    return map;
  };

  fluxRaw.forEach((tableBlock) => {
    if (!tableBlock || !tableBlock.tableMeta || !Array.isArray(tableBlock.tableMeta.columns)) return;

    const idxToLabel = buildIdxToLabel(tableBlock.tableMeta);
    const valuesArr = Array.isArray(tableBlock.values) ? tableBlock.values : [];
    const rawRows = (valuesArr.length > 0 && Array.isArray(valuesArr[0])) ? valuesArr : (valuesArr.length ? [valuesArr] : []);

    rawRows.forEach((row) => {
      if (!Array.isArray(row)) return;

      const obj = {};
      for (let i = 0; i < row.length; i++) {
        const label = idxToLabel[i];
        if (label) obj[label] = row[i];
      }

      const get = (name) => {
        if (Object.prototype.hasOwnProperty.call(obj, name)) return obj[name];
        const key = Object.keys(obj).find(k => k.toLowerCase() === name.toLowerCase());
        return key ? obj[key] : undefined;
      };

      const assetIdRaw = get('assetId') ?? get('assetid') ?? null;
      const signalTypeIdRaw = get('signalTypeId') ?? get('signaltypeid') ?? null;
      const signalName = get('SignalName') ?? get('signalname') ?? null;
      const timeStr = get('_time') ?? get('_Time') ?? null;
      const field = get('_field') ?? get('field') ?? null;
      const rawValue = get('_value');

      // compute timeMs robustly (null if not parseable)
      let timeMs = null;
      if (timeStr !== null && timeStr !== undefined) {
        const parsed = Number(new Date(timeStr));
        timeMs = Number.isFinite(parsed) ? parsed : null;
      }

      const pairKey = assetIdRaw && signalTypeIdRaw ? `${String(assetIdRaw).toLowerCase()}|${String(signalTypeIdRaw).toLowerCase()}` : null;

      // Unit row detection: explicit _field == 'unit' OR rawValue appears string and non-numeric
      if ((field && String(field).toLowerCase() === 'unit') || (!field && typeof rawValue === 'string' && !isNumeric(rawValue))) {
        if (pairKey && timeMs !== null) {
          const arr = unitEntriesMap.get(pairKey) || [];
          arr.push({ timeMs, unit: String(rawValue) });
          unitEntriesMap.set(pairKey, arr);
        }
        return;
      }

      // Numeric value detection
      if (isNumeric(rawValue)) {
        valueEntries.push({
          assetId: assetIdRaw ? String(assetIdRaw).toLowerCase() : null,
          signalTypeId: signalTypeIdRaw ? String(signalTypeIdRaw).toLowerCase() : null,
          signalName,
          timeStr,
          timeMs,
          value: Number(rawValue),
        });
        return;
      }

      // fallback numeric search in row
      let fallback;
      for (let i = 0; i < row.length; i++) {
        const label = idxToLabel[i];
        if (!label) continue;
        if (['result', 'table', '_start', '_stop', '_time', '_measurement', '_field', '_value'].includes(label)) continue;
        const v = obj[label];
        if (isNumeric(v)) { fallback = Number(v); break; }
      }
      if (fallback !== undefined) {
        valueEntries.push({
          assetId: assetIdRaw ? String(assetIdRaw).toLowerCase() : null,
          signalTypeId: signalTypeIdRaw ? String(signalTypeIdRaw).toLowerCase() : null,
          signalName,
          timeStr,
          timeMs,
          value: fallback,
        });
      }
    });
  });

  // helper: convert a UTC ISO/timeMs to IST formatted strings
  const toIstFormats = (utcOrMs) => {
    if (utcOrMs === null || utcOrMs === undefined) return { timeIst: null, timeIstIso: null };
    const d = (typeof utcOrMs === 'number') ? new Date(utcOrMs) : new Date(utcOrMs);
    if (Number.isNaN(d.getTime())) return { timeIst: null, timeIstIso: null };

    const timeIst = d.toLocaleString('en-GB', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    }).replace(',', '');

    const pad = (n, w = 2) => String(n).padStart(w, '0');
    const istMs = d.getTime() + (5.5 * 60 * 60 * 1000); // convert UTC->IST
    const dIst = new Date(istMs);
    const istY = dIst.getFullYear();
    const istM = pad(dIst.getMonth() + 1);
    const istDay = pad(dIst.getDate());
    const istH = pad(dIst.getHours());
    const istMin = pad(dIst.getMinutes());
    const istS = pad(dIst.getSeconds());
    const istMsVal = String(dIst.getMilliseconds()).padStart(3, '0');
    const timeIstIso = `${istY}-${istM}-${istDay}T${istH}:${istMin}:${istS}.${istMsVal}+05:30`;
    return { timeIst, timeIstIso };
  };

  // attach unit to numeric values by nearest unit timestamp within timeWindowMs
  const attachUnitAndDefs = (v) => {
    const pairKey = v.assetId && v.signalTypeId ? `${v.assetId}|${v.signalTypeId}` : null;
    let unitFromInflux;
    if (pairKey && unitEntriesMap.has(pairKey) && v.timeMs !== null) {
      const candUnits = unitEntriesMap.get(pairKey);
      let best = null;
      let bestDiff = Number.POSITIVE_INFINITY;
      candUnits.forEach((u) => {
        const d = Math.abs((u.timeMs || 0) - (v.timeMs || 0));
        if (d < bestDiff) { bestDiff = d; best = u; }
      });
      if (best && bestDiff <= timeWindowMs) unitFromInflux = best.unit;
    }
    const def = findDef(v.signalName);
    const { timeIst, timeIstIso } = toIstFormats(v.timeMs ?? v.timeStr);
    return {
      assetId: v.assetId,
      signalTypeId: v.signalTypeId,
      signalName: v.signalName,
      value: v.value,
      timeIst,
      unit: unitFromInflux ?? (def ? def.unit : undefined),
      minThreshold: def ? def.min : undefined,
      maxThreshold: def ? def.max : undefined
    };
  };

  // Build the results array
  let results = valueEntries.map(attachUnitAndDefs);

  // --- Helper aggregation functions ---

  // 1) latest per asset|signal
  const latestPerPair = (arr) => {
    const map = new Map();
    arr.forEach((r) => {
      const key = `${r.assetId || ''}|${r.signalTypeId || ''}`;
      const cur = map.get(key);
      const rTime = (typeof r.timeMs === 'number' && !Number.isNaN(r.timeMs)) ? r.timeMs : -Infinity;
      const cTime = cur && (typeof cur.timeMs === 'number') ? cur.timeMs : -Infinity;
      if (!cur || rTime > cTime) map.set(key, r);
    });
    return Array.from(map.values());
  };

  // 2) merge-average within timeWindowMs (clusters contiguous samples per pair within window)
  const mergeWithinWindowAvg = (arr, windowMs) => {
    // group by pairKey, sort by timeMs (fall back to index for null times)
    const grouped = new Map();
    arr.forEach((r, idx) => {
      const key = `${r.assetId || ''}|${r.signalTypeId || ''}`;
      const list = grouped.get(key) || [];
      list.push({ ...r, __idx: idx });
      grouped.set(key, list);
    });

    const merged = [];
    grouped.forEach((list) => {
      // sort by time (null times go to end using __idx fallback)
      list.sort((a, b) => {
        const ta = (typeof a.timeMs === 'number' && !Number.isNaN(a.timeMs)) ? a.timeMs : Number.POSITIVE_INFINITY;
        const tb = (typeof b.timeMs === 'number' && !Number.isNaN(b.timeMs)) ? b.timeMs : Number.POSITIVE_INFINITY;
        if (ta === tb) return a.__idx - b.__idx;
        return ta - tb;
      });

      let group = null;
      for (const s of list) {
        const sTime = (typeof s.timeMs === 'number' && !Number.isNaN(s.timeMs)) ? s.timeMs : null;
        if (!group) {
          group = {
            assetId: s.assetId,
            signalTypeId: s.signalTypeId,
            signalName: s.signalName,
            sum: s.value,
            count: 1,
            sumTime: sTime !== null ? sTime : (s.__idx || 0),
            unit: s.unit,
            minThreshold: s.minThreshold,
            maxThreshold: s.maxThreshold,
            timeMsSamples: sTime !== null ? [sTime] : []
          };
          continue;
        }

        const lastTime = group.timeMsSamples.length ? group.timeMsSamples[group.timeMsSamples.length - 1] : (group.sumTime / group.count);
        const gap = (sTime !== null && lastTime !== undefined && lastTime !== null) ? Math.abs((sTime) - lastTime) : Number.POSITIVE_INFINITY;

        if (gap <= windowMs) {
          // merge
          group.sum += s.value;
          group.count += 1;
          if (sTime !== null) {
            group.sumTime += sTime;
            group.timeMsSamples.push(sTime);
          } else {
            group.sumTime += (s.__idx || 0);
          }
          // prefer non-null unit if group.unit is null
          if (!group.unit && s.unit) group.unit = s.unit;
        } else {
          // flush old group
          const avgTimeMs = group.timeMsSamples.length ? Math.round(group.sumTime / group.timeMsSamples.length) : Math.round(group.sumTime / group.count);
          merged.push({
            assetId: group.assetId,
            signalTypeId: group.signalTypeId,
            signalName: group.signalName,
            value: group.sum / group.count,
            timeMs: Number.isFinite(avgTimeMs) ? avgTimeMs : null,
            timeIst: toIstFormats(Number.isFinite(avgTimeMs) ? avgTimeMs : null).timeIst,
            timeIstIso: toIstFormats(Number.isFinite(avgTimeMs) ? avgTimeMs : null).timeIstIso,
            unit: group.unit,
            minThreshold: group.minThreshold,
            maxThreshold: group.maxThreshold
          });

          // start new group
          group = {
            assetId: s.assetId,
            signalTypeId: s.signalTypeId,
            signalName: s.signalName,
            sum: s.value,
            count: 1,
            sumTime: sTime !== null ? sTime : (s.__idx || 0),
            unit: s.unit,
            minThreshold: s.minThreshold,
            maxThreshold: s.maxThreshold,
            timeMsSamples: sTime !== null ? [sTime] : []
          };
        }
      }

      if (group) {
        const avgTimeMs = group.timeMsSamples.length ? Math.round(group.sumTime / group.timeMsSamples.length) : Math.round(group.sumTime / group.count);
        merged.push({
          assetId: group.assetId,
          signalTypeId: group.signalTypeId,
          signalName: group.signalName,
          value: group.sum / group.count,
          timeMs: Number.isFinite(avgTimeMs) ? avgTimeMs : null,
          timeIst: toIstFormats(Number.isFinite(avgTimeMs) ? avgTimeMs : null).timeIst,
          timeIstIso: toIstFormats(Number.isFinite(avgTimeMs) ? avgTimeMs : null).timeIstIso,
          unit: group.unit,
          minThreshold: group.minThreshold,
          maxThreshold: group.maxThreshold
        });
      }
    });

    return merged;
  };

  // --- apply chosen mode ---
  let final;
  if (mode === 'latest') {
    final = latestPerPair(results);
  } else if (mode === 'merge-avg') {
    final = mergeWithinWindowAvg(results, timeWindowMs);
  } else {
    // default 'all' -> return every distinct timestamped sample
    // robust dedupe: use timeMs if available, else timeIstIso, fallback to index
    const seen = new Set();
    final = [];
    results.forEach((r, idx) => {
      const timeKey = (typeof r.timeMs === 'number' && !Number.isNaN(r.timeMs)) ? String(r.timeMs) : (r.timeIstIso || String(idx));
      const k = `${r.assetId || ''}|${r.signalTypeId || ''}|${timeKey}`;
      if (!seen.has(k)) { final.push(r); seen.add(k); }
    });
  }

  // ensure timeIst/timeIstIso available for all final rows
  final = final.map((r) => {
    if ((r.timeIst === null || r.timeIst === undefined) && (r.timeMs !== null && r.timeMs !== undefined)) {
      const { timeIst, timeIstIso } = toIstFormats(r.timeMs);
      r.timeIst = timeIst;
      if (!r.timeIstIso) r.timeIstIso = timeIstIso;
    }
    return r;
  });

  return final;
}



export function buildObservations(asset) {
  const observations = [];
  const flags = new Set();

  for (const [signalName, sig] of Object.entries(asset.signals || {})) {
    for (const point of sig.values || []) {
      if (sig.maxThreshold !== null && point.value > sig.maxThreshold) {
        observations.push(`${signalName} exceeded max threshold (${point.value})`);
        flags.add(`${signalName}_HIGH`);
      }

      if (sig.minThreshold !== null && point.value < sig.minThreshold) {
        observations.push(`${signalName} dropped below min threshold (${point.value})`);
        flags.add(`${signalName}_LOW`);
      }

      if (point.value < 0) {
        observations.push(`${signalName} negative value detected (${point.value})`);
        flags.add(`${signalName}_NEGATIVE`);
      }
    }

    if (sig.aggregated?.length) {
      const agg = sig.aggregated[0];
      if (agg.max - agg.min > (sig.maxThreshold * 0.6)) {
        observations.push(`${signalName} shows abnormal fluctuation`);
        flags.add(`${signalName}_FLUCTUATING`);
      }
    }
  }

  return {
    observations,
    flags: Array.from(flags)
  };
}


export function correlateSignals(flags) {
  const results = [];

  for (const rule of CORRELATION_RULES) {
    if (rule.when.every(w => flags.includes(w))) {
      results.push({
        cause: rule.cause,
        confidence: rule.confidence,
        matchedSignals: rule.when
      });
    }
  }

  return results;
}







export async function searchHistoricalRCA(text) {
  if (!text || !text.trim()) return [];

  const embedding = await embedText(text);

  const result = await qdrant.search(COLLECTION, {
    vector: embedding,
    limit: 1
  });

  if (!result.length) return [];

  const doc = result[0].payload.document;
  const similarity = result[0].score;

  const cause =
    doc.match(/Cause:\s*(.*)/i)?.[1] ?? "Unknown";

  const actionsBlock =
    doc.match(/Recommended Actions:\s*([\s\S]*?)\n\n/i)?.[1] ?? "";

  const occurredOn =
    doc.match(/Date:\s*(.*)/i)?.[1] ?? "Unknown";

  return {
    cause,
    recommendedActions: actionsBlock
      .split("-")
      .map(a => a.trim())
      .filter(Boolean),
    similarity: Number(similarity.toFixed(2)),
    occurredOn
  };
}



export function printSignals(llmInput) {
  if (!llmInput.assets) {
    return;
  }

  for (const [assetName, assetData] of Object.entries(llmInput.assets)) {

    if (!assetData.signals || !Array.isArray(assetData.signals) || assetData.signals.length === 0) {
      continue;
    }

    assetData.signals.forEach(signal => {
      // Print all keys of signal dynamically
      const signalInfo = Object.entries(signal)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    });
  }
}


export async function ensureCollection() {
  const collections = await qdrant.getCollections();
  const exists = collections.collections.find(c => c.name === COLLECTION);

  if (!exists) {
    await qdrant.createCollection(COLLECTION, {
      vectors: {
        size: 768,
        distance: "Cosine"
      }
    });
    console.log("Qdrant collection created:", COLLECTION);
  } else {
    console.log("Qdrant collection already exists:", COLLECTION);
  }
}



export const sqlConfig = {
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  database: process.env.SQL_SERVER_DB,
  server: process.env.SQL_SERVER_HOST, // tmind-sql
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

