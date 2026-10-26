using System;
using System.ComponentModel.DataAnnotations;

namespace MyApp.Application.Dtos
{
    public class OpcUaNodeDto
    {
        public Guid? OpcUaNodeId { get; set; }
        
        [Required]
        [MaxLength(500)]
        public string NodeId { get; set; } = string.Empty;

         public Guid? SignalId { get; set; }
        [Required]
        [MaxLength(200)]
        public string SignalName { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string DataType { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Unit { get; set; }

        public double ScalingFactor { get; set; } = 1.0;

        public Guid? SignalTypeId { get; set; }  // kept for response only
    }

    // Request DTO for creating OPC UA node
    public class CreateOpcUaNodeRequest
    {
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

    }
}