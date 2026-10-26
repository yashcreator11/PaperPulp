using System.Text.RegularExpressions;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using System.Security.Cryptography;
using MyApp.Infrastructure.Data;
using MyApp.Application.DTOs;
using System.Text;
using System.Security.Cryptography.X509Certificates;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;

namespace MyApp.Infrastructure.Services
{
    public class GatewayService : IGatewayService
    {
        private readonly AppDbContext _dbContext;

        public GatewayService(AppDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        public async Task<GatewayCredentialsResponse> AddGatewayAsync(string gatewayName)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(gatewayName))
                    throw new ArgumentException("Gateway name is required", nameof(gatewayName));

                bool isExist = await _dbContext.Gateway
                                .AnyAsync(g => g.Name == gatewayName);

                if (isExist)
                {
                    throw new ArgumentException(
                        "Gateway with the same name already exists",
                        nameof(gatewayName)
                    );
                }

                gatewayName = gatewayName.Trim();

                if (gatewayName.Length < 3)
                    throw new ArgumentException("Gateway name must be at least 3 characters long", nameof(gatewayName));

                if (gatewayName.Length > 50)
                    throw new ArgumentException("Gateway name cannot exceed 50 characters", nameof(gatewayName));

                if (!Regex.IsMatch(gatewayName, @"^[a-zA-Z0-9_-]+$"))
                    throw new ArgumentException(
                        "Gateway name can contain only letters, numbers, hyphen and underscore",
                        nameof(gatewayName));

                var clientId = $"GW-{Guid.NewGuid():N}";
                var clientSecret = GenerateSecretKey(32);
                var clientSecretHash = HashSecret(clientSecret);

                //  RabbitMQ Credentials
                var rabbitMqUsername = gatewayName;
                var rabbitMqPassword = GenerateSecretKey(16);

                var caCertPath = "/certs/ca.crt";

                if (!System.IO.File.Exists(caCertPath))
                    throw new Exception("CA certificate not found");

                var certBytes = await System.IO.File.ReadAllBytesAsync(caCertPath);
                var certBase64 = Convert.ToBase64String(certBytes);

                //  Create RabbitMQ user using Management API
                await CreateRabbitMqUserAsync(rabbitMqUsername, rabbitMqPassword);
                await SetRabbitMqPermissionsAsync(rabbitMqUsername);

                var newGateway = new Gateway
                {
                    Name = gatewayName,
                    ClientId = clientId,
                    ClientSecretHash = clientSecretHash,
                    Status = "ACTIVE"
                };

                _dbContext.Gateway.Add(newGateway);
                await _dbContext.SaveChangesAsync();




                return new GatewayCredentialsResponse
                {
                    Message = "Gateway Added Successfully",
                    ClientId = clientId,
                    ClientSecret = clientSecret,
                    RabbitMqUsername = rabbitMqUsername,
                    RabbitMqPassword = rabbitMqPassword,
                    CaCertificateBase64 = certBase64   //   Send here
                };
            }
            catch (Exception ex)
            {
                throw new Exception("Something went wrong: " + ex.Message);
            }
        }

        // Update Gateway Name 
        public async Task<GatewayCredentialsResponse> UpdateGatewayNameAsync(string clientId, string newGatewayName)
        {
            try
            {
                var gateway = await _dbContext.Gateway
                                .FirstOrDefaultAsync(g => g.ClientId == clientId);

                if (gateway == null)
                    throw new ArgumentException("Gateway not found", nameof(clientId));

                if (string.IsNullOrWhiteSpace(newGatewayName))
                    throw new ArgumentException("New gateway name is required", nameof(newGatewayName));

                newGatewayName = newGatewayName.Trim();

                bool isExist = await _dbContext.Gateway
                                .AnyAsync(g => g.Name == newGatewayName && g.ClientId != clientId);

                if (isExist)
                    throw new ArgumentException("Another gateway with the same name already exists", nameof(newGatewayName));

                if (newGatewayName.Length < 3)
                    throw new ArgumentException("New gateway name must be at least 3 characters long", nameof(newGatewayName));

                if (newGatewayName.Length > 50)
                    throw new ArgumentException("New gateway name cannot exceed 50 characters", nameof(newGatewayName));

                if (!Regex.IsMatch(newGatewayName, @"^[a-zA-Z0-9_-]+$"))
                    throw new ArgumentException(
                        "New gateway name can contain only letters, numbers, hyphen and underscore",
                        nameof(newGatewayName));


                var oldRabbitMqUsername = gateway.Name;

                // Update DB
                gateway.Name = newGatewayName;
                await _dbContext.SaveChangesAsync();

                // Update RabbitMQ user
                await DeleteRabbitMqUserAsync(oldRabbitMqUsername);
                await CreateRabbitMqUserAsync(newGatewayName, GenerateSecretKey(16));
                await SetRabbitMqPermissionsAsync(newGatewayName);

                return new GatewayCredentialsResponse
                {
                    Message = "Gateway Name Updated Successfully",
                    ClientId = gateway.ClientId,
                    ClientSecret = null
                };
            }
            catch (Exception ex)
            {
                throw new Exception("Something went wrong while processing gateway", ex);
            }
        }
        //Delete Gateway 
        public async Task<string> DeleteGatewayAsync(string clientId)
        {
            try
            {
                var gateway = await _dbContext.Gateway
                                .FirstOrDefaultAsync(g => g.ClientId == clientId);

                if (gateway == null)
                    throw new ArgumentException("Gateway not found", nameof(clientId));

                await DeleteRabbitMqUserAsync(gateway.Name);

                _dbContext.Gateway.Remove(gateway);
                await _dbContext.SaveChangesAsync();

                return "Gateway Deleted Successfully";
            }
            catch (Exception ex)
            {
                throw new Exception("Something went wrong while deleting gateway", ex);
            }
        }

        public async Task<List<GetGetwayDto>> GetAllGateways()
        {
            try
            {
                var Gateways = await _dbContext.Gateway.ToListAsync();

                if (Gateways.Count == 0)
                    return [];

                var Result = Gateways.Select(x => new GetGetwayDto
                {
                    Name = x.Name,
                    ClientId = x.ClientId
                }).ToList();

                return Result;
            }
            catch (Exception ex)
            {
                throw new Exception("Something went wrong: " + ex.Message);
            }
        }



        private static string GenerateSecretKey(int size = 32)
        {
            var bytes = new byte[size];
            RandomNumberGenerator.Fill(bytes);
            return Convert.ToBase64String(bytes);
        }

        private static string HashSecret(string secret)
        {
            using var sha256 = SHA256.Create();
            var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(secret));
            return Convert.ToHexString(hashBytes);
        }

        // ============================================================
        //   RabbitMQ Management API Integration
        // ============================================================

        private async Task CreateRabbitMqUserAsync(string username, string password)
        {
            using var httpClient = new HttpClient();

            var byteArray = Encoding.ASCII.GetBytes("guest:guest");
            httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue(
                    "Basic", Convert.ToBase64String(byteArray));

            var content = new StringContent(
                $"{{\"password\":\"{password}\",\"tags\":\"management\"}}",
                Encoding.UTF8,
                "application/json");

            //   FIXED HOSTNAME HERE
            var response = await httpClient.PutAsync(
                $"http://rabbitmq:15672/api/users/{username}",
                content);

            response.EnsureSuccessStatusCode();
        }

        private async Task SetRabbitMqPermissionsAsync(string username)
        {
            using var httpClient = new HttpClient();

            var byteArray = Encoding.ASCII.GetBytes("guest:guest");
            httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue(
                    "Basic", Convert.ToBase64String(byteArray));

            var content = new StringContent(
                "{\"configure\":\".*\",\"write\":\".*\",\"read\":\".*\"}",
                Encoding.UTF8,
                "application/json");

            //   FIXED HOSTNAME HERE
            var response = await httpClient.PutAsync(
                $"http://rabbitmq:15672/api/permissions/%2F/{username}",
                content);

            response.EnsureSuccessStatusCode();
        }

        private async Task DeleteRabbitMqUserAsync(string username)
        {
            using var httpClient = new HttpClient();

            var byteArray = Encoding.ASCII.GetBytes("guest:guest");
            httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue(
                    "Basic", Convert.ToBase64String(byteArray));

            var response = await httpClient.DeleteAsync(
                $"http://rabbitmq:15672/api/users/{username}");

            // 404 means user doesn't exist — treat as success to avoid blocking DB operations
            if (!response.IsSuccessStatusCode && response.StatusCode != System.Net.HttpStatusCode.NotFound)
                response.EnsureSuccessStatusCode();
        }


        public async Task<GatewayCredentialsResponse> RefreshClientSecretAsync(string clientId)
        {
            try
            {
                var gateway = await _dbContext.Gateway.FirstOrDefaultAsync(g => g.ClientId == clientId);

                if (gateway == null)
                    throw new ArgumentException("Gateway not found", nameof(clientId));

                if(gateway.Status != "ACTIVE")
                    throw new InvalidOperationException("Only ACTIVE gateways can refresh client secret");
                
                var newClientSecret = GenerateSecretKey(32);
                var newClientSecretHash = HashSecret(newClientSecret);

                gateway.ClientSecretHash = newClientSecretHash;
                await _dbContext.SaveChangesAsync();

                return new GatewayCredentialsResponse
                {
                    Message = "Client Secret Refreshed Successfully",
                    ClientId = gateway.ClientId,
                    ClientSecret = newClientSecret
                };
            }
            catch (Exception ex)
            {
                throw new Exception("Something went wrong while refreshing client secret", ex);
            }
        }
    }

    
}