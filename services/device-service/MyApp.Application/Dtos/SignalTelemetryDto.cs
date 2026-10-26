using System;

namespace MyApp.Application.Dtos
{
    /// <summary>
    /// Simplified telemetry payload for queue - signal-centric
    /// Only contains SignalId, Value, and Timestamp
    /// </summary>
    public record SignalTelemetryDto(
        Guid SignalId,
        double Value,
        DateTime Timestamp
    );
}