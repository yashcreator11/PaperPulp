using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MyApp.Application.Dtos;
using MyApp.Application.Interfaces;
using System;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

namespace MyApp.Api.Controllers
{
    [ApiController]
    [Route("api/devices/{deviceId}/opcua-nodes")]
    [Authorize]
    public class OpcUaNodesController : ControllerBase
    {
        private readonly IDeviceManager _mgr;
        private readonly ILogger<OpcUaNodesController> _log;

        public OpcUaNodesController(IDeviceManager mgr, ILogger<OpcUaNodesController> log)
        {
            _mgr = mgr;
            _log = log;
        }

        // POST /api/devices/{deviceId}/opcua-nodes
        [HttpPost]
        [Authorize(Roles = "Admin, Engineer")]
        public async Task<IActionResult> Create(
            Guid deviceId,
            [FromBody] CreateOpcUaNodeRequest request,
            CancellationToken ct = default)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail("Invalid request data"));

            try
            {
                var nodeId = await _mgr.AddOpcUaNodeAsync(deviceId, request, ct);
                return CreatedAtAction(
                    nameof(Get),
                    new { deviceId, id = nodeId },
                    ApiResponse<object>.Ok(new { opcUaNodeId = nodeId })
                );
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Create OPC UA node failed for device {DeviceId}", deviceId);
                return StatusCode(
                    (int)HttpStatusCode.InternalServerError,
                    ApiResponse<object>.Fail("An unexpected error occurred.")
                );
            }
        }

        // GET /api/devices/{deviceId}/opcua-nodes
        [HttpGet]
        public async Task<IActionResult> GetAll(Guid deviceId, CancellationToken ct = default)
        {
            try
            {
                var nodes = await _mgr.GetOpcUaNodesByDeviceAsync(deviceId, ct);
                return Ok(ApiResponse<object>.Ok(nodes));
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Get OPC UA nodes failed for device {DeviceId}", deviceId);
                return StatusCode(
                    (int)HttpStatusCode.InternalServerError,
                    ApiResponse<object>.Fail("An unexpected error occurred.")
                );
            }
        }

        // GET /api/devices/{deviceId}/opcua-nodes/{id}
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> Get(Guid deviceId, Guid id, CancellationToken ct = default)
        {
            try
            {
                var node = await _mgr.GetOpcUaNodeAsync(id, ct);
                if (node == null || node.DeviceId != deviceId)
                    return NotFound(ApiResponse<object>.Fail("OPC UA node not found"));

                return Ok(ApiResponse<object>.Ok(node));
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Get OPC UA node {NodeId} failed", id);
                return StatusCode(
                    (int)HttpStatusCode.InternalServerError,
                    ApiResponse<object>.Fail("An unexpected error occurred.")
                );
            }
        }

        // PUT /api/devices/{deviceId}/opcua-nodes/{id}
        [HttpPut("{id:guid}")]
        [Authorize(Roles = "Admin, Engineer")]
        public async Task<IActionResult> Update(
            Guid deviceId,
            Guid id,
            [FromBody] CreateOpcUaNodeRequest request,
            CancellationToken ct = default)
        {
            if (!ModelState.IsValid)
                return BadRequest(ApiResponse<object>.Fail("Invalid request data"));

            try
            {
                var node = await _mgr.GetOpcUaNodeAsync(id, ct);
                if (node == null || node.DeviceId != deviceId)
                    return NotFound(ApiResponse<object>.Fail("OPC UA node not found"));

                await _mgr.UpdateOpcUaNodeAsync(id, request, ct);
                return Ok(ApiResponse<object>.Ok(null));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Update OPC UA node {NodeId} failed", id);
                return StatusCode(
                    (int)HttpStatusCode.InternalServerError,
                    ApiResponse<object>.Fail("An unexpected error occurred.")
                );
            }
        }

        // DELETE /api/devices/{deviceId}/opcua-nodes/{id}
        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(Guid deviceId, Guid id, CancellationToken ct = default)
        {
            try
            {
                var node = await _mgr.GetOpcUaNodeAsync(id, ct);
                if (node == null || node.DeviceId != deviceId)
                    return NotFound(ApiResponse<object>.Fail("OPC UA node not found"));

                await _mgr.DeleteOpcUaNodeAsync(id, ct);
                return Ok(ApiResponse<object>.Ok(null));
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ApiResponse<object>.Fail(ex.Message));
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ApiResponse<object>.Fail(ex.Message));
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Delete OPC UA node {NodeId} failed", id);
                return StatusCode(
                    (int)HttpStatusCode.InternalServerError,
                    ApiResponse<object>.Fail("An unexpected error occurred.")
                );
            }
        }
    }
}