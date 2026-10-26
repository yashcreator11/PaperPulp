using MyApp.Domain.Entities;


namespace MyApp.Application.Dtos.DeviceMatching
{
    public class MatchedDeviceDto
    {
        public Guid DeviceId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DeviceProtocol Protocol { get; set; }
        public List<MatchedSlaveDto>? MatchedSlaves { get; set; }
        public List<MatchedNodeDto>? MatchedNodes { get; set; }  // ← must be here
    }

    public class MatchedSlaveDto
    {
        public Guid DeviceSlaveId { get; set; }
        public int SlaveIndex { get; set; }
        public bool IsHealthy { get; set; }
        public List<MatchedRegisterDto> MatchedRegisters { get; set; } = new();
    }

    public class MatchedRegisterDto
    {
        public Guid RegisterId { get; set; }
        public int RegisterAddress { get; set; }
        public string SignalName { get; set; } = string.Empty;
        public string SignalUnit { get; set; } = string.Empty;
        public int? RegisterLength { get; set; }
        public string? DataType { get; set; }
        public bool? IsHealthy { get; set; }
        public double? Scale { get; set; }
        public string? ByteOrder { get; set; }
        public bool? WordSwap { get; set; }
    }

    public class MatchedNodeDto
    {
        public Guid? OpcUaNodeId { get; set; }
        public string? NodeId { get; set; }
        public string SignalName { get; set; } = string.Empty;
        public string SignalUnit { get; set; } = string.Empty;
        public string? DataType { get; set; }
        public double? ScalingFactor { get; set; }
    }
}
