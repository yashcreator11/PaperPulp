using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Application.DTOs.ReportDTos;
using ClosedXML.Excel;
using CsvHelper;
using CsvHelper.Configuration;
using InfluxDB.Client;
using InfluxDB.Client.Api.Domain;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Globalization;
using Infrastructure.Configuration;
using DocumentFormat.OpenXml.InkML;
using Domain.Entities;
using Application.Interface;
using Microsoft.Extensions.DependencyInjection;
using Infrastructure.DBs;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Service
{
    public class ReportGenerationService : BackgroundService
    {
        private IConnection _connection = null!;
        private IModel _consumeChannel = null!;
        private readonly ILogger<ReportGenerationService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly TelemetryOptions _option;
        private readonly string _queuename;
        private readonly string _reportsFolder;
        private readonly InfluxDBClient _influxClient;
        private readonly string _bucket;
        private readonly string _org;
        private readonly IInfluxDbConnectionService _influxDbService;


        // Excel limits per signal based on total signals
        private const int MAX_EXCEL_ROWS = 300000;

        public ReportGenerationService(
            IConfiguration configuration,
            IOptions<TelemetryOptions> option,
            IOptions<InfluxDbOptions> options2,
            ILogger<ReportGenerationService> logger,
           IInfluxDbConnectionService client,
           IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
            _option = option.Value;
            _queuename = _option.ReportRequestQueue ?? "report_queue";
            _influxDbService = client;
            _influxClient = _influxDbService.GetClient();

            if (_influxClient == null)
            {
                var success = _influxDbService.TryInitializeAsync();
                //if (success)
                //    throw new Exception("Failed to initialize InfluxDB client");
                _influxClient = _influxDbService.GetClient();
            }
            var config = options2.Value;
            _bucket = config.InfluxBucket;
            _org = config.InfluxOrg;

            // Reports folder path
            _reportsFolder = Path.Combine(Directory.GetCurrentDirectory(), "Reports");
            if (!Directory.Exists(_reportsFolder))
            {
                Directory.CreateDirectory(_reportsFolder);
            }

            _logger.LogInformation("Reports folder: {Folder}", _reportsFolder);
        }

        protected override Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                _logger.LogInformation("Starting ReportGenerationService...");
                CreateRabbitMQConnection();
                SetupConsumer();
                _logger.LogInformation("ReportGenerationService started successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to start ReportGenerationService");
                throw;
            }

            return Task.CompletedTask;
        }

        private void CreateRabbitMQConnection()
        {
            var factory = new ConnectionFactory
            {
                HostName = _option.RabbitHost,

                UserName = _option.RabbitUser,
                Password = _option.RabbitPass,

                DispatchConsumersAsync = true,
                AutomaticRecoveryEnabled = true,
                NetworkRecoveryInterval = TimeSpan.FromSeconds(10)
            };

            _connection = factory.CreateConnection("ReportGenerationService");
            _logger.LogInformation("RabbitMQ connection established");
        }

        private void SetupConsumer()
        {
            _consumeChannel = _connection.CreateModel();

            var queueDeclareOk = _consumeChannel.QueueDeclare(
                queue: _queuename,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null
            );

            _logger.LogInformation("Queue declared: {Queue}, Messages: {Count}",
                queueDeclareOk.QueueName, queueDeclareOk.MessageCount);

            _consumeChannel.BasicQos(0, 1, false);

            var consumer = new AsyncEventingBasicConsumer(_consumeChannel);

            consumer.Received += async (sender, e) =>
            {
                var deliveryTag = e.DeliveryTag;

                try
                {
                    var message = Encoding.UTF8.GetString(e.Body.ToArray());
                    _logger.LogInformation("Message received: {Message}", message);

                    var reportRequest = JsonSerializer.Deserialize<ReportQueueItem>(
                        message,
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true }
                    );

                    if (reportRequest == null)
                    {
                        _logger.LogWarning("Failed to deserialize message");
                        _consumeChannel.BasicNack(deliveryTag, false, false);
                        return;
                    }

                    // Generate report
                    await GenerateReportAsync(reportRequest);

                    _consumeChannel.BasicAck(deliveryTag, false);
                    _logger.LogInformation("Report generated and ACK sent");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to process message");
                    _consumeChannel.BasicNack(deliveryTag, false, false);
                }
            };

            _consumeChannel.BasicConsume(_queuename, false, consumer);
            _logger.LogInformation("Started consuming from queue: {Queue}", _queuename);
        }

        private async Task GenerateReportAsync(ReportQueueItem request)
        {
            try
            {
                _logger.LogInformation(
                    "Generating {Format} report for Asset: {AssetId}, Signals: {SignalCount}, Date Range: {Start} to {End}",
                    request.ReportFormat, request.AssetId, request.SignalIds.Count,
                    request.StartDate, request.EndDate);

                // Calculate limit per signal
                var limitPerSignal = CalculateLimitPerSignal(request.SignalIds.Count, request.TotalRows);

                _logger.LogInformation("Limit per signal: {Limit}", limitPerSignal);

                if (request.ReportFormat.Equals("Excel", StringComparison.OrdinalIgnoreCase))
                {
                    await GenerateExcelReportAsync(request, limitPerSignal);
                }
                else if (request.ReportFormat.Equals("CSV", StringComparison.OrdinalIgnoreCase))
                {
                    await GenerateCsvReportAsync(request, limitPerSignal);
                }
                else
                {
                    _logger.LogWarning("Unsupported report format: {Format}", request.ReportFormat);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating report");
                throw;
            }
        }

        private int CalculateLimitPerSignal(int signalCount, int totalRows)
        {
            if (signalCount == 0) return MAX_EXCEL_ROWS;

            // Split limit evenly among signals, but cap at MAX_EXCEL_ROWS total
            var limitPerSignal = MAX_EXCEL_ROWS / signalCount;

            // If total rows requested is less, use that
            if (totalRows > 0 && totalRows < MAX_EXCEL_ROWS)
            {
                limitPerSignal = Math.Min(limitPerSignal, totalRows / signalCount);
            }

            return limitPerSignal;
        }

        private async Task GenerateExcelReportAsync(ReportQueueItem request, int limitPerSignal)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<DBContext>();


            if (!Guid.TryParse(request.AssetId, out var assetId))
            {
                _logger.LogError("Invalid AssetId: {AssetId}", request.AssetId);
                return;
            }


            var assetName = await db.Assets
                .AsNoTracking()
                .Where(a => a.AssetId == assetId)
                .Select(a => a.Name)
                .FirstOrDefaultAsync();

            assetName ??= request.AssetId;


            var safeAssetName = string.Concat(
                assetName.Split(Path.GetInvalidFileNameChars())
            );


            var fileName = $"Report_{safeAssetName}_{DateTime.UtcNow:yyyy/MMdd/_HHmmss}.xlsx";
            var filePath = Path.Combine(_reportsFolder, fileName);

            using var workbook = new XLWorkbook();


            var signalGuids = request.SignalIds
                .Select(id => Guid.TryParse(id, out var g) ? g : Guid.Empty)
                .Where(g => g != Guid.Empty)
                .Distinct()
                .ToList();


            var signalInfoMap = await db.Signals
                .AsNoTracking()
                .Where(s => signalGuids.Contains(s.SignalId))
                .ToDictionaryAsync(s => s.SignalId, s => new { s.SignalName, s.Unit });

            foreach (var signalIdStr in request.SignalIds)
            {
                if (!Guid.TryParse(signalIdStr, out var signalId))
                    continue;

                var signalInfo = signalInfoMap.GetValueOrDefault(signalId);
                var signalName = signalInfo?.SignalName ?? signalIdStr;
                var signalUnit = signalInfo?.Unit ?? "";


                var data = await FetchDataFromInfluxDBAsync(
                    request.AssetId,
                    signalIdStr,
                    request.StartDate,
                    request.EndDate,
                    limitPerSignal
                );

                if (data.Count == 0)
                    continue;


                var sheetName = SanitizeSheetName(signalName);
                var ws = workbook.Worksheets.Add(sheetName);


                ws.Cell(1, 1).Value = "Asset Name";
                ws.Cell(1, 2).Value = "Signal Name";
                ws.Cell(1, 3).Value = "Timestamp";
                ws.Cell(1, 4).Value = "Value";
                ws.Cell(1, 5).Value = "Unit";

                ws.Range(1, 1, 1, 5).Style.Font.Bold = true;


                int row = 2;
                foreach (var r in data)
                {
                    ws.Cell(row, 1).Value = assetName;
                    ws.Cell(row, 2).Value = signalName;
                    ws.Cell(row, 3).Value = r.Timestamp;
                    ws.Cell(row, 4).Value = r.Value;
                    ws.Cell(row, 5).Value = signalUnit;
                    row++;
                }

                ws.Columns().AdjustToContents();
            }

            workbook.SaveAs(filePath);


            var reportRequest = new ReportRequest
            {
                ReportId = Guid.NewGuid(),
                AssetId = assetId,
                AssetName = assetName,
                SignalIds = string.Join(",", request.SignalIds),
                FileName = fileName,
                FilePath = filePath,
                RequestedAt = DateTime.UtcNow,
                Status = "Completed"
            };

            db.ReportRequests.Add(reportRequest);
            await db.SaveChangesAsync();
            _logger.LogInformation("Excel report created: {FilePath}", filePath);
        }


        private async Task GenerateCsvReportAsync(ReportQueueItem request, int limitPerSignal)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<DBContext>();

            if (!Guid.TryParse(request.AssetId, out var assetId))
            {
                _logger.LogError("Invalid AssetId: {AssetId}", request.AssetId);
                return;
            }


            var assetName = await db.Assets
                .AsNoTracking()
                .Where(a => a.AssetId == assetId)
                .Select(a => a.Name)
                .FirstOrDefaultAsync();

            assetName ??= request.AssetId;

            var safeAssetName = string.Concat(
                assetName.Split(Path.GetInvalidFileNameChars())
            );

            var fileName = $"Report_{safeAssetName}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
            var filePath = Path.Combine(_reportsFolder, fileName);


            var signalGuids = request.SignalIds
                .Select(id => Guid.TryParse(id, out var g) ? g : Guid.Empty)
                .Where(g => g != Guid.Empty)
                .Distinct()
                .ToList();

            var signalInfoMap = await db.Signals
                .AsNoTracking()
                .Where(s => signalGuids.Contains(s.SignalId))
                .ToDictionaryAsync(s => s.SignalId, s => new { s.SignalName, s.Unit });

            using var writer = new StreamWriter(filePath, false, Encoding.UTF8);
            using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture));

            csv.WriteField("Asset Name");
            csv.WriteField("Signal Name");
            csv.WriteField("Timestamp");
            csv.WriteField("Value");
            csv.WriteField("Unit");
            await csv.NextRecordAsync();

            foreach (var signalIdStr in request.SignalIds)
            {
                if (!Guid.TryParse(signalIdStr, out var signalId))
                    continue;

                var signalInfo = signalInfoMap.GetValueOrDefault(signalId);
                var signalName = signalInfo?.SignalName ?? signalIdStr;
                var signalUnit = signalInfo?.Unit ?? "";

                var data = await FetchDataFromInfluxDBAsync(
                    request.AssetId,
                    signalIdStr,
                    request.StartDate,
                    request.EndDate,
                    limitPerSignal
                );

                if (data.Count == 0)
                    continue;

                foreach (var record in data)
                {
                    csv.WriteField(assetName);
                    csv.WriteField(signalName);
                    csv.WriteField(record.Timestamp);
                    csv.WriteField(record.Value);
                    csv.WriteField(signalUnit);
                    await csv.NextRecordAsync();
                }
            }


            var reportRequest = new ReportRequest
            {
                ReportId = Guid.NewGuid(),
                AssetId = assetId,
                AssetName = assetName,
                SignalIds = string.Join(",", request.SignalIds),
                FileName = fileName,
                FilePath = filePath,
                RequestedAt = DateTime.UtcNow,
                Status = "Completed"
            };

            db.ReportRequests.Add(reportRequest);
            await db.SaveChangesAsync();

            _logger.LogInformation("CSV report created: {FilePath}", filePath);
        }


        private async Task<List<TelemetryRecord>> FetchDataFromInfluxDBAsync(
            string assetId,
            string signalId,
            DateTime startDate,
            DateTime endDate,
            int limit)
        {
            var records = new List<TelemetryRecord>();

            try
            {

                var fluxStartTime = startDate.ToString("yyyy-MM-ddTHH:mm:ssZ");
                var fluxEndTime = endDate.ToString("yyyy-MM-ddTHH:mm:ssZ");
                var bucket = _bucket ?? "SignalValueTeleMentry";
                var org = _org ?? "MyOrg";



                var flux = $@"
                from(bucket: ""{bucket}"")
                |> range(start: {fluxStartTime}, stop: {fluxEndTime})
                |> filter(fn: (r) => r[""_measurement""] == ""signals"")
                |> filter(fn: (r) => r[""_field""] == ""value"")
                |> filter(fn: (r) => r[""assetId""] == ""{assetId}"")
                |> filter(fn: (r) => r[""signalId""] == ""{signalId}"")
                |> yield(name: ""mean"")
                ";



                _logger.LogInformation("Executing {flux} query for Signal: {SignalId}", flux, signalId);

                if (_influxClient == null)
                {
                    _logger.LogInformation("the Inlflux db clinet is null");
                    return [];
                }
                var queryApi = _influxClient.GetQueryApi();

                var fluxTables = await queryApi.QueryAsync(flux, org);

                foreach (var table in fluxTables)
                {
                    foreach (var record in table.Records)
                    {
                        var timestamp = record.GetTime();
                        var value = record.GetValue();

                        if (timestamp.HasValue && value != null)
                        {
                            records.Add(new TelemetryRecord
                            {
                                Timestamp = timestamp.Value.ToDateTimeUtc(),
                                SignalId = signalId,

                                Value = Convert.ToDouble(value)
                            });
                        }
                    }



                    // _logger.LogInformation("Fetched {Count} records for Signal: {SignalId}", records.Count, signalId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching data from InfluxDB for Signal: {SignalId}", signalId);
            }

            return records;
        }

        private string SanitizeSheetName(string name)
        {
            // Excel sheet names: max 31 chars, no special chars
            var invalid = new[] { ':', '\\', '/', '?', '*', '[', ']' };
            foreach (var c in invalid)
            {
                name = name.Replace(c, '_');
            }

            return name.Length > 31 ? name.Substring(0, 31) : name;
        }

        public override void Dispose()
        {
            _logger.LogInformation("Disposing ReportGenerationService...");
            _consumeChannel?.Close();
            _consumeChannel?.Dispose();
            _connection?.Close();
            _connection?.Dispose();
            base.Dispose();
        }
    }

    // DTO for telemetry records
    public class TelemetryRecord
    {
        public DateTime Timestamp { get; set; }
        public string SignalId { get; set; } = string.Empty;
        public double Value { get; set; }
    }
}