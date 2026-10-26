namespace MappingService.DTOs
{
    public class MappingResponseDto
    {
        public Guid MappingId { get; set; }
        public Guid AssetId { get; set; }
        public Guid SignalTypeId { get; set; }
        public Guid DeviceId { get; set; }
        public Guid DevicePortId { get; set; }
        public Guid RegisterId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
