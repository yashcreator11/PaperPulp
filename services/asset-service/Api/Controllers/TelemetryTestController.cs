using Microsoft.AspNetCore.Mvc;
using Application.Interface;
using Application.DTOs;
using Application.Enums;
using Infrastructure.Seeding;
using Microsoft.AspNetCore.Authorization;

namespace WebAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TelemetryTestController : ControllerBase
    {
        private readonly IInfluxDbConnectionService _connectionService;
        private readonly IInfluxTelementryService _TelementryService;
        private readonly BackfillService _backfill;

        public TelemetryTestController(
            IInfluxDbConnectionService connectionService,
            IInfluxTelementryService telementryService,
            BackfillService backfill)
        {
            _connectionService = connectionService;
            _TelementryService = telementryService;
            _backfill = backfill;
        }

        // FIX CS0618: HealthAsync() is obsolete, replaced with PingAsync()
        [HttpGet("health")]
        public async Task<IActionResult> TestConnection()
        {
            try
            {
                var client = _connectionService.GetClient();
                var alive = await client.PingAsync();
                return Ok(new { status = "Connected", message = $"InfluxDB reachable: {alive}" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { status = "Failed", message = ex.Message });
            }
        }

        [HttpPost("query")]
        [Authorize(Roles = "Admin,Engineer,Operator")]
        public async Task<IActionResult> GetTelemetry([FromBody] TelemetryRequestDto request)
        {
            try
            {
                var result = await _TelementryService.GetTelemetrySeriesAsync(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpGet("last-hour")]
        [Authorize(Roles = "Admin,Engineer,Operator")]
        public async Task<IActionResult> GetLastHour(
            [FromQuery] Guid assetId,
            [FromQuery] Guid signalId)
        {
            return await GetTelemetry(new TelemetryRequestDto
            {
                AssetId = assetId,
                SignalId = signalId,
                TimeRange = TimeRange.LastHour
            });
        }

        [HttpGet("last-24-hours")]
        [Authorize(Roles = "Admin,Engineer,Operator")]
        public async Task<IActionResult> GetLast24Hours(
            [FromQuery] Guid assetId,
            [FromQuery] Guid signalId)
        {
            return await GetTelemetry(new TelemetryRequestDto
            {
                AssetId = assetId,
                SignalId = signalId,
                TimeRange = TimeRange.Last24Hours
            });
        }

        [HttpGet("last-7-days")]
        [Authorize(Roles = "Admin,Engineer,Operator")]
        public async Task<IActionResult> GetLast7Days(
            [FromQuery] Guid assetId,
            [FromQuery] Guid signalId)
        {
            return await GetTelemetry(new TelemetryRequestDto
            {
                AssetId = assetId,
                SignalId = signalId,
                TimeRange = TimeRange.Last7Days
            });
        }

        [HttpGet("custom-range")]
        [Authorize(Roles = "Admin,Engineer,Operator")]
        public async Task<IActionResult> GetCustomRange(
            [FromQuery] Guid assetId,
            [FromQuery] Guid signalId,
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime? endDate = null)
        {
            return await GetTelemetry(new TelemetryRequestDto
            {
                AssetId = assetId,
                SignalId = signalId,
                TimeRange = TimeRange.Custom,
                StartDate = startDate,
                EndDate = endDate
            });
        }

        [HttpPost("queryraw")]
        [Authorize(Roles = "Admin,Engineer,Operator")]
        public async Task<IActionResult> GetRawTelemetry([FromBody] TelemetryRequestDto request)
        {
            try
            {
                var result = await _TelementryService.GetRawData(request);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = ex.Message });
            }
        }

        [HttpPost("Seed/{assetId}/{signalId}/{pollingInterval}")]
        [Authorize(Roles = "Admin")]
        public IActionResult GenerateBackfill(Guid assetId, Guid signalId, int pollingInterval)
        {
            _ = Task.Run(async () => await _backfill.GenerateBackfillData(assetId, signalId, pollingInterval));
            return Ok("Backfill started. It may take a few minutes to complete.");
        }
    }
}