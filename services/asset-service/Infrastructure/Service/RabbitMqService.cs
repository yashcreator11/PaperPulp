using System.Text.Json;
using Infrastructure.Service;
using RabbitMQ.Client;
using Microsoft.Extensions.Options;

public class RabbitMqService : IDisposable
{
    private readonly TelemetryOptions _option;
    private IConnection? _connection;
    private IModel? _channel; // reuse channel
    private readonly string _queueName;
    private readonly object _lock = new();

    public RabbitMqService(IOptions<TelemetryOptions> option)
    {
        _option = option.Value ?? throw new ArgumentNullException(nameof(option));
        _queueName = _option.ReportRequestQueue;
    }

    // Lazy connection ensure
    private void EnsureConnection()
    {
        if (_connection != null && _connection.IsOpen) return;

        lock (_lock)
        {
            if (_connection != null && _connection.IsOpen) return;

            var factory = new ConnectionFactory
            {
                HostName = _option.RabbitHost ?? "localhost",
                UserName = _option.RabbitUser ?? "guest",
                Password = _option.RabbitPass ?? "guest",
                AutomaticRecoveryEnabled = true,
                RequestedConnectionTimeout = TimeSpan.FromSeconds(5)
            };

            _connection = factory.CreateConnection();
            _channel = _connection.CreateModel();

            // Declare queue once
            _channel.QueueDeclare(
                queue: _queueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                arguments: null
            );
        }
    }

    public Task PublishAsync<T>(T payload, CancellationToken ct = default)
    {
        if (ct.IsCancellationRequested)
            return Task.FromCanceled(ct);

        EnsureConnection(); // make sure connection/channel exist

        var body = JsonSerializer.SerializeToUtf8Bytes(payload);
        var props = _channel!.CreateBasicProperties();
        props.Persistent = true;
        props.ContentType = "application/json";
        props.MessageId = Guid.NewGuid().ToString();
        props.Timestamp = new AmqpTimestamp(DateTimeOffset.UtcNow.ToUnixTimeSeconds());

        _channel.BasicPublish(
            exchange: "",           // default exchange
            routingKey: _queueName, // MUST match queue name
            basicProperties: props,
            body: body
        );

        return Task.CompletedTask;
    }

    public void Dispose()
    {
        try
        {
            _channel?.Close();
            _channel?.Dispose();
            _connection?.Close();
            _connection?.Dispose();
        }
        catch { /* ignore */ }
    }
}
