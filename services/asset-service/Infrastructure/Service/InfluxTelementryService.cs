using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.DTOs;
using Application.DTOs.ReportDTos;
using Application.Enums;
using Application.Interface;
using InfluxDB.Client;
using InfluxDB.Client.Api.Domain;
using InfluxDB.Client.Writes;
using Infrastructure.Configuration;
using Infrastructure.DBs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Serilog;

namespace Infrastructure.Service
{
    public class InfluxTelemetryService : IInfluxTelementryService
    {
        private readonly InfluxDBClient _client;
        private readonly string _bucket;
        private readonly string _org;
        private readonly int _maxExcelRows;
        private readonly int _maxCsvRows;
        private readonly DBContext _dbContext;
        private readonly QueryApi _queryApi;
        private readonly ILogger<InfluxTelemetryService> _logger;
        private readonly RabbitMqService _queue;

        public InfluxTelemetryService(
            ILogger<InfluxTelemetryService> logger,
            IInfluxDbConnectionService client,
            IOptions<InfluxDbOptions> options,
            DBContext dbContext,
            RabbitMqService queue)
        {
            _client = client.GetClient() ?? throw new Exception("InfluxDB client not initialized");
            var config = options.Value;
            _bucket = config.InfluxBucket;
            _org = config.InfluxOrg;
            _dbContext = dbContext;
            _queryApi = _client.GetQueryApi();
            _logger = logger;
            _maxExcelRows = config.ExcelMaxRows;
            _maxCsvRows = config.CsvMaxRows;
            _queue = queue;
        }

        public async Task WriteTelemetryAsync(InfluxTelementryDto dto)
        {
            try
            {
                var point = PointData
                    .Measurement("signals")
                    .Tag("signalId", dto.SignalId.ToString())
                    .Tag("assetId", dto.AssetId.ToString())
                    .Tag("deviceId", dto.DeviceId.ToString())
                    .Tag("signalName", dto.SignalType)
                    .Field("value", dto.Value)
                    .Field("unit", dto.Unit)
                    .Timestamp(dto.Timestamp, WritePrecision.Ns);

                var writeApi = _client.GetWriteApiAsync();
                await writeApi.WritePointAsync(point, _bucket, _org);
            }
            catch (Exception ex)
            {
                Log.Error(ex,
                    "Failed to write telemetry | SignalId:{SignalId} | Asset:{AssetId}",
                    dto.SignalId, dto.AssetId);
                throw;
            }
        }

        public async Task<TelemetryResponseDto> GetTelemetrySeriesAsync(TelemetryRequestDto request)
        {
            try
            {
                var signal = await _dbContext.Signals
                    .FirstOrDefaultAsync(s =>
                        s.AssetId == request.AssetId &&
                        s.SignalId == request.SignalId);

                if (signal == null)
                    throw new Exception($"Signal not found for AssetId:{request.AssetId} and SignalId:'{request.SignalId}'");

                var (startTime, endTime) = GetTimeRange(request);

                string flux = BuildFluxQuery(signal.AssetId, signal.SignalId, startTime, endTime, "Aggregated");

                var tables = await _queryApi.QueryAsync(flux, _org);
                var values = new List<TelemetryPointDto>();

                foreach (var table in tables)
                {
                    foreach (var record in table.Records)
                    {
                        if (record.GetTime().HasValue && record.GetValue() != null)
                        {
                            values.Add(new TelemetryPointDto
                            {
                                Time = record.GetTime()!.Value.ToDateTimeUtc().ToLocalTime(),
                                Value = (float)Math.Round(Convert.ToSingle(record.GetValue()), 2)
                            });
                        }
                    }
                }

                return new TelemetryResponseDto
                {
                    AssetId = signal.AssetId,
                    DeviceId = signal.DeviceId,
                    SignalId = signal.SignalId,
                    SignalName = signal.SignalName,
                    Unit = signal.Unit ?? string.Empty,
                    StartTime = startTime,
                    EndTime = endTime,
                    TimeRange = request.TimeRange.ToString(),
                    Values = values
                };
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to fetch telemetry | AssetId:{AssetId} | SignalId:{SignalId}",
                    request.AssetId, request.SignalId);
                throw new Exception($"Failed to retrieve telemetry: {ex.Message}");
            }
        }

        public async Task<TelemetryResponseDto> GetRawData(TelemetryRequestDto request)
        {
            try
            {
                var (startTime, endTime) = GetTimeRange(request);

                if (endTime <= startTime)
                    throw new Exception("EndTime must be greater than StartTime");

                var signal = await _dbContext.Signals
                    .FirstOrDefaultAsync(s =>
                        s.AssetId == request.AssetId &&
                        s.SignalId == request.SignalId);

                if (signal == null)
                    throw new Exception($"Signal not found for AssetId:{request.AssetId} and SignalId:'{request.SignalId}'");

                string flux = BuildFluxQuery(signal.AssetId, signal.SignalId, startTime, endTime, "Raw");

                var tables = await _queryApi.QueryAsync(flux, _org);
                var values = new List<TelemetryPointDto>();

                foreach (var table in tables)
                {
                    foreach (var record in table.Records)
                    {
                        if (record.GetTime().HasValue && record.GetValue() != null)
                        {
                            values.Add(new TelemetryPointDto
                            {
                                Time = record.GetTime()!.Value.ToDateTimeUtc().ToLocalTime(),
                                Value = (float)Math.Round(Convert.ToSingle(record.GetValue()), 2)
                            });
                        }
                    }
                }

                return new TelemetryResponseDto
                {
                    AssetId = signal.AssetId,
                    DeviceId = signal.DeviceId,
                    SignalId = signal.SignalId,
                    SignalName = signal.SignalName,
                    Unit = signal.Unit ?? string.Empty,  // CS8601 fix
                    StartTime = startTime,
                    EndTime = endTime,
                    Values = values
                };
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to fetch RAW telemetry | AssetId:{AssetId} | SignalId:{SignalId}",
                    request.AssetId, request.SignalId);
                throw;
            }
        }

        private (DateTime startTime, DateTime endTime) GetTimeRange(TelemetryRequestDto request)
        {
            var now = DateTime.UtcNow;
            DateTime startTime;
            DateTime endTime = now;

            switch (request.TimeRange)
            {
                case TimeRange.LastHour:
                    startTime = now.AddHours(-1);
                    break;
                case TimeRange.Last24Hours:
                    startTime = now.AddHours(-24);
                    break;
                case TimeRange.Last7Days:
                    startTime = now.AddDays(-7);
                    break;
                case TimeRange.Last30Days:
                    startTime = now.AddDays(-30);
                    break;
                case TimeRange.Custom:
                    if (!request.StartDate.HasValue)
                        throw new Exception("StartDate required");

                    startTime = request.StartDate.Value.ToUniversalTime();
                    endTime = request.EndDate?.ToUniversalTime() ?? now;
                    break;
                default:
                    throw new Exception("Unsupported range");
            }

            return (startTime, endTime);
        }

        private string BuildFluxQuery(Guid assetId, Guid signalId, DateTime startTime, DateTime endTime, string type)
        {
            var fluxStartTime = startTime.ToString("yyyy-MM-ddTHH:mm:ssZ");
            var fluxEndTime = endTime.ToString("yyyy-MM-ddTHH:mm:ssZ");

            if (type == "Aggregated")
            {
                var window = GetAggregationWindow(startTime, endTime);
                return $@"
            from(bucket: ""{_bucket}"")
            |> range(start: {fluxStartTime}, stop: {fluxEndTime})
            |> filter(fn: (r) => r._field == ""value"")
            |> filter(fn: (r) => r.assetId == ""{assetId}"")
            |> filter(fn: (r) => r.signalId == ""{signalId}"")
            |> aggregateWindow(every: {window}, fn: mean, createEmpty: false)
            |> keep(columns: [""_time"", ""_value""])
            |> sort(columns: [""_time""], desc: false)";
            }
            else
            {
                return $@"
            from(bucket: ""{_bucket}"")
            |> range(start: {fluxStartTime}, stop: {fluxEndTime})
            |> filter(fn: (r) => r._field == ""value"")
            |> filter(fn: (r) => r.assetId == ""{assetId}"")
            |> filter(fn: (r) => r.signalId == ""{signalId}"")
            |> keep(columns: [""_time"", ""_value""])
            |> sort(columns: [""_time""], desc: false)";
            }
        }

        public async Task PushToReportRequestQueueAsync(RequestReport dto)
        {
            try
            {
                _logger.LogInformation("Processing report request for AssetID: {AssetID}", dto.AssetID);

                bool isAssetExist = await _dbContext.Assets.AnyAsync(a => a.AssetId == dto.AssetID);
                if (!isAssetExist)
                    throw new Exception("No Asset Found");

                List<Guid> signalIds = dto.SignalIDs;
                var matchedSignals = await _dbContext.Signals
                    .Where(s => s.AssetId == dto.AssetID && signalIds.Contains(s.SignalId))
                    .Select(s => new { s.SignalId, s.SignalName })
                    .ToListAsync();

                var foundIds = matchedSignals.Select(s => s.SignalId).ToList();
                var invalidIds = signalIds.Except(foundIds).ToList();
                if (invalidIds.Any())
                    throw new Exception($"One or more SignalIDs are invalid: {string.Join(", ", invalidIds)}");

                var signalIdStrings = matchedSignals.Select(s => s.SignalId.ToString().ToLower()).ToList();

                int totalRows = await GetRowsCountFromInfluxDbAsync(
                    signalIdStrings,
                    dto.StartDate ?? DateTime.UtcNow.AddDays(-1),
                    dto.EndDate ?? DateTime.UtcNow
                );

                string finalReportFormat = DetermineReportFormat(dto.ReportFormat, totalRows);

                var reportRequest = new ReportQueueItem
                {
                    AssetId = dto.AssetID.ToString(),
                    SignalIds = signalIdStrings,
                    StartDate = dto.StartDate ?? DateTime.UtcNow.AddDays(-1),
                    EndDate = dto.EndDate ?? DateTime.UtcNow,
                    ReportFormat = finalReportFormat,
                    TotalRows = totalRows,
                    RequestedAt = DateTime.UtcNow
                };

                await _queue.PublishAsync(reportRequest);

                _logger.LogInformation("Report request queued for AssetID: {AssetID}", dto.AssetID);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing report request for AssetID: {AssetID}", dto.AssetID);
                throw;
            }
        }

        private string DetermineReportFormat(string requestedFormat, long totalRows)
        {
            if (totalRows == 0)
            {
                _logger.LogWarning("No data found for the specified criteria");
                throw new Exception("No data available for the specified date range and signals");
            }

            if (totalRows > _maxCsvRows)
            {
                _logger.LogError("Data volume exceeds maximum limit. Rows: {TotalRows}, Max: {MaxRows}",
                    totalRows, _maxCsvRows);
                throw new Exception(
                    $"The requested report contains {totalRows:N0} rows, which exceeds the maximum limit of {_maxCsvRows:N0} rows. " +
                    "Please reduce the date range or number of signals, or request aggregated data instead."
                );
            }

            if (requestedFormat.Equals("Excel", StringComparison.OrdinalIgnoreCase) && totalRows > _maxExcelRows)
            {
                _logger.LogWarning(
                    "Excel format requested but row count ({TotalRows}) exceeds Excel limit ({MaxExcel}). Switching to CSV.",
                    totalRows, _maxExcelRows
                );
                return "CSV";
            }

            if (requestedFormat.Equals("CSV", StringComparison.OrdinalIgnoreCase) && totalRows <= _maxCsvRows)
                return "CSV";

            if (requestedFormat.Equals("Excel", StringComparison.OrdinalIgnoreCase) && totalRows <= _maxExcelRows)
                return "Excel";

            _logger.LogInformation("Using CSV format as default for {TotalRows} rows", totalRows);
            return "CSV";
        }

        private string GetAggregationWindow(DateTime start, DateTime end)
        {
            var duration = end - start;

            Log.Information($"the duration is {duration}");

            if (duration <= TimeSpan.FromHours(6))
                return "5s";
            if (duration <= TimeSpan.FromDays(1))
                return "1m";
            else if (duration <= TimeSpan.FromDays(7))
                return "5m";
            else if (duration <= TimeSpan.FromDays(30))
                return "10m";
            else if (duration <= TimeSpan.FromDays(90))
                return "30m";
            else if (duration <= TimeSpan.FromDays(180))
                return "1h";
            else if (duration <= TimeSpan.FromDays(365))
                return "2h";
            else
                return "5h";
        }

        private async Task<int> GetRowsCountFromInfluxDbAsync(List<string> signalIds, DateTime startTime, DateTime endTime)
        {
            try
            {
                if (signalIds == null || signalIds.Count == 0)
                {
                    _logger.LogWarning("No signal IDs provided for count query.");
                    return 0;
                }

                _logger.LogInformation("Preparing count query for {Count} signal IDs", signalIds.Count);

                var fluxStartTime = startTime.ToString("yyyy-MM-ddTHH:mm:ssZ");
                var fluxEndTime = endTime.ToString("yyyy-MM-ddTHH:mm:ssZ");

                string fluxArray = string.Join(",", signalIds.Select(id => $"\"{id.ToLower()}\""));

                string fluxQuery = $@"
            signalIds = [{fluxArray}]
            from(bucket: ""{_bucket}"")
            |> range(start: {fluxStartTime}, stop: {fluxEndTime})
            |> filter(fn: (r) => r._field == ""value"")
            |> filter(fn: (r) => contains(value: r.signalId, set: signalIds))
            |> count()";

                var queryApi = _client.GetQueryApi();
                var tables = await queryApi.QueryAsync(fluxQuery, _org);

                int totalCount = tables.Sum(table => table.Records.Sum(r => Convert.ToInt32(r.GetValue())));
                _logger.LogInformation("Total rows from InfluxDB: {TotalCount}", totalCount);

                return totalCount;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error querying InfluxDB for row count.");
                throw;
            }
        }
    }
}