using MyApp.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace MyApp.Api.Controllers
{
    [ApiController]
    [Route("api/Gateway")]
    public class GatewayController : ControllerBase
    {
        private readonly IGatewayService _service;

        public GatewayController(IGatewayService service)
        {
            _service = service;
        }


        [HttpGet]
        public async Task<IActionResult> GetAllGateways()
        {
            try
            {
                var Gateways = await _service.GetAllGateways();
                return Ok(Gateways);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }


        [HttpPost("{Name}")]
        public async Task<IActionResult> OnboardGateway(string Name)
        {
            try
            {

                var result = await _service.AddGatewayAsync(Name);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{clientId}/{newGatewayName}")]
        public async Task<IActionResult> UpdateGatewayName(string clientId, string newGatewayName)
        {
            try
            {
                var result = await _service.UpdateGatewayNameAsync(clientId, newGatewayName);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{clientId}")]
        public async Task<IActionResult> DeleteGateway(string clientId)
        {
            try
            {
                var result = await _service.DeleteGatewayAsync(clientId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("refresh-secret/{clientId}")]
        public async Task<IActionResult> RefreshClientSecret(string clientId)
        {
            try
            {
                var result = await _service.RefreshClientSecretAsync(clientId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }



    }
}