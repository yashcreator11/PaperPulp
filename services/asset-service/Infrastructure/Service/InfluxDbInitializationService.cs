using Application.Interface;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Infrastructure.Service
{
    public class InfluxDbInitializationService : IHostedService
    {
        private readonly IInfluxDbConnectionService _influxDbService;
        private readonly ILogger<InfluxDbInitializationService> _logger;

        public InfluxDbInitializationService(
            IInfluxDbConnectionService influxDbService,
            ILogger<InfluxDbInitializationService> logger)
        {
            _influxDbService = influxDbService;
            _logger = logger;
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Starting InfluxDB initialization...");

            var maxRetries = 5;
            var retryCount = 0;

            while (retryCount < maxRetries && !cancellationToken.IsCancellationRequested)
            {
                var success = await _influxDbService.TryInitializeAsync();

                if (success)
                {
                    _logger.LogInformation("InfluxDB initialized successfully");
                    return;
                }

                retryCount++;
                _logger.LogWarning(
                    "InfluxDB initialization attempt {Attempt}/{MaxRetries} failed. Retrying in 5 seconds...",
                    retryCount,
                    maxRetries);

                await Task.Delay(5000, cancellationToken);
            }

            _logger.LogError("Failed to initialize InfluxDB after {MaxRetries} attempts", maxRetries);
            throw new Exception($"InfluxDB initialization failed after {maxRetries} attempts");
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("InfluxDB initialization service stopped");
            return Task.CompletedTask;
        }
    }
}