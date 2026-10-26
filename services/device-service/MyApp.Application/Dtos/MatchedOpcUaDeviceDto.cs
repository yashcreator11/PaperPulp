    namespace MyApp.Application.DTOs
    {

    public class MatchBySignalRequest
    {
        public Guid[] SignalTypeIds { get; set; } = Array.Empty<Guid>();
    }

    public class MatchedOpcUaNodeDto
    {
        public Guid    OpcUaNodeId   { get; set; }
        public string  NodeId        { get; set; } = string.Empty;
        public string  SignalName    { get; set; } = string.Empty;
        public Guid    SignalTypeId  { get; set; }
        public string? DataType      { get; set; }
        public string? Unit          { get; set; }
        public double? ScalingFactor { get; set; }
    }

   public class MatchedOpcUaDeviceDto
{
    public Guid                      DeviceId     { get; set; }
    public string?                   Name         { get; set; }
    public string?                   Description  { get; set; }
    public int                       Protocol     { get; set; }
    public List<MatchedOpcUaNodeDto> MatchedNodes { get; set; } = new();
}
    }