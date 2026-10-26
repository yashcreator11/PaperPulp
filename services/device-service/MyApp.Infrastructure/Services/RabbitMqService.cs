using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using System;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace MyApp.Infrastructure.Services
{
    public class RabbitMqService : IDisposable
    {
        private readonly IConnection _connection;
        private readonly ConnectionFactory _factory;
        private readonly string _exchange;
        private readonly string _queueName;
        private readonly ILogger<RabbitMqService> _log;

        public RabbitMqService(IConfiguration config, ILogger<RabbitMqService> log)
        {
            _log = log;

            _factory = new ConnectionFactory
            {
                HostName = config.GetValue<string>("RabbitMQ:Host") ?? "localhost",
                UserName = config.GetValue<string>("RabbitMQ:User") ?? "guest",
                Password = config.GetValue<string>("RabbitMQ:Pass") ?? "guest",
                AutomaticRecoveryEnabled = true,
            };

            _exchange = config.GetValue<string>("RabbitMQ:Exchange") ?? "telemetry_exchange";
            _queueName = config.GetValue<string>("RabbitMQ:Queue") ?? "telemetry_queue";

            _connection = _factory.CreateConnection();

            using var ch = _connection.CreateModel();

            ch.ExchangeDeclare(exchange: _exchange, type: ExchangeType.Fanout, durable: true, autoDelete: false);

            ch.QueueDeclare(
                queue: _queueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null
            );

            ch.QueueBind(queue: _queueName, exchange: _exchange, routingKey: "");
        }

        public Task PublishAsync<T>(T message, CancellationToken ct = default)
        {
            if (ct.IsCancellationRequested)
                return Task.FromCanceled(ct);

            try
            {
                var json = JsonSerializer.Serialize(message);
                var body = Encoding.UTF8.GetBytes(json);

                using var channel = _connection.CreateModel();

                var props = channel.CreateBasicProperties();
                props.Persistent = true;
                props.ContentType = "application/json";
                props.MessageId = Guid.NewGuid().ToString();
                props.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());

                // ✅ Recommended: publish via exchange
                channel.BasicPublish(
                    exchange: _exchange,
                    routingKey: "",
                    basicProperties: props,
                    body: body
                );

                return Task.CompletedTask;
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Failed to publish message to RabbitMQ");
                throw;
            }
        }

        public void Dispose()
        {
            try
            {
                _connection?.Close();
                _connection?.Dispose();
            }
            catch { }
        }
    }
}
