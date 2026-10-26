using System;
using System.Text.Json.Serialization;

namespace Application.DTOs
{
    public class TelemetryDto
    {
        [JsonPropertyName("DeviceId")]
        public Guid DeviceId { get; set; }

        [JsonPropertyName("deviceSlaveId")]
        public Guid deviceSlaveId { get; set; }

        [JsonPropertyName("slaveIndex")]
        public int SlaveIndex { get; set; }

        [JsonPropertyName("RegisterAddress")]
        public int RegisterAddress { get; set; }

        [JsonPropertyName("SignalType")]
        public string SignalType { get; set; } = string.Empty;

        [JsonPropertyName("Value")]
        public float Value { get; set; }

        [JsonPropertyName("Unit")]
        public string Unit { get; set; } = string.Empty;

        [JsonPropertyName("Timestamp")]
        public DateTime TimestampUtc { get; set; }
    }
}