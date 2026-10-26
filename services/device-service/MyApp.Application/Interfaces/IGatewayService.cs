using MyApp.Application.DTOs;

namespace MyApp.Application.Interfaces
{
    public interface IGatewayService
    {
        Task<GatewayCredentialsResponse> AddGatewayAsync(string GatewayName);

        Task<GatewayCredentialsResponse> UpdateGatewayNameAsync(string clientId, string newGatewayName);

        Task<string> DeleteGatewayAsync(string clientId);

        Task<List<GetGetwayDto>> GetAllGateways();

        Task<GatewayCredentialsResponse> RefreshClientSecretAsync(string clientId);
    }
}