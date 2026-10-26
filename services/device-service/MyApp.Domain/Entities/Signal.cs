using System;

namespace MyApp.Domain.Entities
{
    public class Signal
    {
        public Guid SignalId { get; set; }
        public string SignalKey { get; set; } = string.Empty;
        public Guid AssetId { get; set; }
        public Guid DeviceId { get; set; }
        public string SignalName { get; set; } = string.Empty;
        public string? Unit { get; set; }
        public DateTime CreatedAt { get; set; }

        public double? MinThreshold { get; set; }
        public double? MaxThreshold { get; set; }
        public Guid? RegisterId { get; set; }
        public Guid? OpcUaNodeId { get; set; }
    }
}