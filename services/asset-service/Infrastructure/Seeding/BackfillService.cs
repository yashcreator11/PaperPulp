using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using InfluxDB.Client;
using InfluxDB.Client.Writes;
using Microsoft.Extensions.Options;
using Application.Interface;
using Infrastructure.Configuration;
using InfluxDB.Client.Api.Domain;
using Infrastructure.DBs;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Internal;

namespace Infrastructure.Seeding
{
    public class BackfillService
    {
        private readonly InfluxDBClient _client;
        private readonly string _bucket;
        private readonly string _org;
        private readonly IDbContextFactory<DBContext> _dbFactory;

        private readonly Dictionary<string, (float Min, float Max)> SignalRanges =
           new Dictionary<string, (float Min, float Max)>
{
    { "Voltage",     (21.49f, 22.51f) },
    { "Current",     (14.70f, 15.31f) },
    { "Temperature", (28.98f, 31.02f) },
    { "Frequency",   (4.90f, 5.10f) },
    { "Vibration",   (0.15f, 0.25f) },
    { "FlowRate",    (9.20f, 10.82f) },
    { "RPM",         (16.80f, 19.22f) },
    { "Torque",      (2.30f, 2.70f) }
};


        public BackfillService(
            IInfluxDbConnectionService client,
            IOptions<InfluxDbOptions> options,
            IDbContextFactory<DBContext> dbFactory)
        {
            _client = client.GetClient();
            var config = options.Value;
            _bucket = config.InfluxBucket;
            _org = config.InfluxOrg;

            _dbFactory = dbFactory;
        }

        public async Task GenerateBackfillData(Guid assetId, Guid signalId, int pollingInterval)
        {
            Console.WriteLine($"[INFO] Backfill started at {DateTime.Now}");

            try
            {
                var writeApi = _client.GetWriteApi();
                DateTime startLocal = DateTime.Now.AddMonths(-1);
                DateTime endLocal = DateTime.Now;

                await using var context = _dbFactory.CreateDbContext();

                // Fetch signal directly from Signals table
                var signal = await context.Signals
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.SignalId == signalId && s.AssetId == assetId);

                if (signal == null)
                {
                    Console.WriteLine("[ERROR] Signal not found.");
                    return;
                }

                Random rand = new Random();
                int counter = 0;
                int batchSize = 5000;
                var batch = new List<PointData>();

                for (var timestampLocal = startLocal; timestampLocal <= endLocal;
                     timestampLocal = timestampLocal.AddSeconds(pollingInterval))
                {
                    // Use signal's own min/max thresholds if available, else fallback to SignalRanges dict
                    float min, max;
                    if (signal.MinThreshold.HasValue && signal.MaxThreshold.HasValue)
                    {
                        min = (float)signal.MinThreshold.Value;
                        max = (float)signal.MaxThreshold.Value;
                    }
                    else
                    {
                        (min, max) = GetRange(signal.SignalName);
                    }

                    float value = min + (float)rand.NextDouble() * (max - min);

                    var point = PointData.Measurement("signals")
                        .Tag("assetId", signal.AssetId.ToString())
                        .Tag("signalId", signal.SignalId.ToString())
                        .Tag("deviceId", signal.DeviceId.ToString())
                        .Tag("signalName", signal.SignalName)
                        .Field("value", value)
                        .Field("unit", signal.Unit ?? string.Empty)
                        .Timestamp(timestampLocal, WritePrecision.Ns);

                    batch.Add(point);
                    counter++;

                    if (batch.Count >= batchSize)
                    {
                        try
                        {
                            writeApi.WritePoints(batch, _bucket, _org);
                            Console.WriteLine($"[INFO] {counter} points written, last timestamp: {timestampLocal}");
                            batch.Clear();
                        }
                        catch (Exception exBatch)
                        {
                            Console.WriteLine($"[ERROR] Batch write failed: {exBatch.Message}");
                        }
                    }
                }

                if (batch.Count > 0)
                {
                    writeApi.WritePoints(batch, _bucket, _org);
                    Console.WriteLine($"[INFO] Final batch of {batch.Count} points written. Total: {counter}");
                }

                Console.WriteLine($"[INFO] Backfill completed at {DateTime.Now}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Backfill failed: {ex.Message}");
            }
        }

        public (float Min, float Max) GetRange(string signalName)
        {
            if (SignalRanges.TryGetValue(signalName, out var range))
                return range;
            return (0f, 1f);
        }
    }
}
