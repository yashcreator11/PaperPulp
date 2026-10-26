using System;
using System.ComponentModel.DataAnnotations;

namespace MappingService.Domain.Entities
{
    public class AssetSignalDeviceMapping
    {
        [Key]
        public Guid MappingId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid AssetId { get; set; }

        [Required]
        public Guid SignalTypeId { get; set; }

        [Required]
        public Guid DeviceId { get; set; }

        public Guid? DevicePortId { get; set; }

        [Required]
        public string SignalUnit { get; set; } = string.Empty;

        public string SignalName { get; set; } = string.Empty;

        public int? RegisterAdress { get; set; }

        public Guid? registerId { get; set; }

        public Guid? OpcUaNodeId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}