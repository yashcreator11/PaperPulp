namespace Application.DTOs
{
    public class CreateMappingDto
    {
        public Guid AssetId { get; set; }
        public Guid DeviceId { get; set; }

        // One of these must be provided
        public RegisterMappingDto? Register { get; set; }
        public OpcUaMappingDto? OpcUaNode { get; set; }

        public class RegisterMappingDto
        {
            public Guid RegisterId { get; set; }
            public string SignalName { get; set; } = string.Empty;
            public string? Unit { get; set; }
            public double? MinThreshold { get; set; }
            public double? MaxThreshold { get; set; }
        }

        public class OpcUaMappingDto
        {
            public Guid OpcUaNodeId { get; set; }
            public string SignalName { get; set; } = string.Empty;
            public string? Unit { get; set; }
            public double? MinThreshold { get; set; }
            public double? MaxThreshold { get; set; }
        }
    }
}