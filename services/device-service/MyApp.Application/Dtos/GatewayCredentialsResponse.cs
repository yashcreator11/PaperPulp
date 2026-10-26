namespace MyApp.Application.DTOs
{
    public class GatewayCredentialsResponse
    {
        public string Message { get; set; } = string.Empty;
        public string ClientId { get; set; } = string.Empty;
        public string ClientSecret { get; set; } = string.Empty;
        public string RabbitMqUsername { get; set; } = string.Empty;
        public string RabbitMqPassword { get; set; } = string.Empty;
        public string CaCertificateBase64 { get; set; } = string.Empty;
    }

    public class GetGetwayDto
    {
        public string Name { get; set; } = string.Empty;
        public string ClientId { get; set; } = string.Empty;
    }
}