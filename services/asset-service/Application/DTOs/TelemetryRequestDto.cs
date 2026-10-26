using System;
using Application.Enums;

namespace Application.DTOs
{
    public class TelemetryRequestDto
    {
        public Guid AssetId { get; set; }
        public Guid SignalId { get; set; }

        // Time range option
        public TimeRange TimeRange { get; set; } = TimeRange.LastHour;

        // Custom date range (only used when TimeRange = Custom)
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }
}