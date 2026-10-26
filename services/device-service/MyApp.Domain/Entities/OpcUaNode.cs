using System;
using System.ComponentModel.DataAnnotations;

namespace MyApp.Domain.Entities
{
    public class OpcUaNode
    {
        [Key]
        public Guid OpcUaNodeId { get; set; } = Guid.NewGuid();

        [Required]
        public Guid DeviceId { get; set; }

        [Required]
        [MaxLength(500)]
        public string NodeId { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string SignalName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string DataType { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Unit { get; set; }

        public double ScalingFactor { get; set; } = 1.0;

        

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public Device Device { get; set; } = null!;
    }
}
