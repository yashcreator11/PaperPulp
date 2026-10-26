// Application/DTOs/OpcUaDeviceWithNodesDto.cs

namespace Application.DTOs
{
    public class OpcUaDeviceWithNodesDto
    {
        public Guid DeviceId { get; set; }
        public string Name { get; set; } = string.Empty;
        public List<OpcUaNodeDto> Nodes { get; set; } = new();
    }

    public class OpcUaNodeDto
    {
        public Guid OpcUaNodeId { get; set; }
        public string NodeId { get; set; } = string.Empty;
        public string SignalName { get; set; } = string.Empty;
        public string? DataType { get; set; }
        public string? Unit { get; set; }
        public double? ScalingFactor { get; set; }
    }
}