using System;
using System.Collections.Generic;
using System.Linq;

namespace Application.DTOs
{
    public class TelemetryResponseDto
    {
        public Guid AssetId { get; set; }
        public Guid DeviceId { get; set; }
        public Guid SignalId { get; set; }

        public string SignalName { get; set; } = string.Empty;

        public string Unit { get; set; } = string.Empty;

        public string TimeRange { get; set; } = string.Empty;

        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }

        public List<TelemetryPointDto> Values { get; set; } = new();

        public TelemetryStats? Stats => CalculateStats();

        private TelemetryStats? CalculateStats()
        {
            if (Values == null || Values.Count == 0)
                return null;

            var valuesList = Values.Select(v => v.Value).ToList();

            return new TelemetryStats
            {
                Count = Values.Count,
                Min = valuesList.Min(),
                Max = valuesList.Max(),
                Average = valuesList.Average(),
                FirstValue = Values.First().Value,
                LastValue = Values.Last().Value,
                FirstTimestamp = Values.First().Time,
                LastTimestamp = Values.Last().Time
            };
        }
    }

    public class TelemetryStats
    {
        public int Count { get; set; }
        public float Min { get; set; }
        public float Max { get; set; }
        public float Average { get; set; }
        public float FirstValue { get; set; }
        public float LastValue { get; set; }
        public DateTime FirstTimestamp { get; set; }
        public DateTime LastTimestamp { get; set; }
    }

    public class TelemetryPointDto
    {
        public DateTime Time { get; set; }
        public float Value { get; set; }
    }
}