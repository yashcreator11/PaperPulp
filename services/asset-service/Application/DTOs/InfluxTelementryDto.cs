using System;

namespace Application.DTOs
{
    public class InfluxTelementryDto
    {
        public Guid SignalId { get; set; }

        public Guid AssetId { get; set; }
        public Guid DeviceId { get; set; }

        public string SignalType { get; set; } = string.Empty;

        public double Value { get; set; }

        public string Unit { get; set; } = string.Empty;

        public DateTime Timestamp { get; set; }
    }
}