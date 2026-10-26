using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MappingService.DTOs;
using MappingService.Domain.Entities;
using Application.Interface;
using Application.DTOs;

namespace MappingService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MappingController : ControllerBase
    {
        private readonly IMappingService _mappingService;

        public MappingController(IMappingService mappingService)
        {
            _mappingService = mappingService;
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Engineer")]
        public async Task<IActionResult> CreateMapping([FromBody] CreateMappingDto dto)
        {
            if (dto.AssetId == Guid.Empty || dto.DeviceId == Guid.Empty)
                return BadRequest(new { Message = "AssetId and DeviceId are required." });

            try
            {
                var signal = await _mappingService.CreateMapping(dto);
                return Ok(new { Message = "Signal mapped successfully", Data = signal });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = ex.Message });
            }
        }

        [HttpPatch("{mappingId}/thresholds")]
        [Authorize(Roles = "Admin,Engineer")]
        public async Task<IActionResult> UpdateThresholds(Guid mappingId, [FromBody] UpdateThresholdsDto dto)
        {
            try
            {
                var updated = await _mappingService.UpdateThresholds(mappingId, dto.MinThreshold, dto.MaxThreshold);
                if (!updated)
                    return NotFound(new { Message = "Mapping not found." });

                return Ok(new { Message = "Thresholds updated successfully." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = ex.Message });
            }
        }

        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetMappings()
        {
            try
            {
                var mappings = await _mappingService.GetMappings();
                return Ok(mappings);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = ex.Message });
            }
        }

        [HttpDelete("{AssetId}")]
        [Authorize(Roles = "Admin,Engineer")]
        public async Task<IActionResult> UnAssignDevicesFromAsset(Guid AssetId)
        {
            try
            {
                await _mappingService.UnassignDevice(AssetId);
                return Ok(new { Message = "Device disconnected successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
        }

        [HttpGet("mappings/{assetId}")]
        [Authorize]
        public async Task<IActionResult> GetMappingsOnAsset(Guid assetId)
        {
            try
            {
                var mappingonasset = await _mappingService.GetSignalsOnAnAsset(assetId);
                return Ok(mappingonasset);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = ex.Message });
            }
        }

        [HttpGet("signals/{assetId}")]
        [Authorize]
        public async Task<IActionResult> GetSignalsByAsset(Guid assetId)
        {
            try
            {
                var signals = await _mappingService.GetSignalsByAsset(assetId);
                return Ok(signals);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = ex.Message });
            }
        }

        [HttpDelete("/api/deletemap/{mappingId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteMappingAsync(Guid mappingId)
        {
            try
            {
                bool deleted = await _mappingService.DeleteMappingAsync(mappingId);

                if (!deleted)
                    return NotFound(new { Message = "Mapping not found." });

                return Ok(new { Message = "Mapping deleted successfully." });
            }
            catch (Exception)
            {
                return StatusCode(500, new { Message = "Internal server error while deleting mapping." });
            }
        }


        [HttpPatch("{signalId}/thresholds/clear")]
        [Authorize(Roles = "Admin,Engineer")]
        public async Task<IActionResult> ClearMinMaxThresholds(Guid signalId)
        {
            try
            {
                var signal = await _mappingService.ClearMinMaxThresholds(signalId);
                return Ok(new { Message = "Thresholds cleared successfully.", Data = signal });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { Message = ex.Message });
            }
        }
    }
}