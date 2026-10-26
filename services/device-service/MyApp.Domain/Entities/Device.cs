using System;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;

namespace MyApp.Domain.Entities
{
    public class Device
    {
        [Key]
        public Guid DeviceId { get; set; } = Guid.NewGuid();

        [NotNull]
        public string GatewayId {get; set;} = string.Empty;
        public string Name { get; set; } = null!;
        public string? Description { get; set; }
        public DeviceProtocol Protocol { get; set; } 
        public Boolean IsDeleted { get; set; } = false;
        public Guid? DeviceConfigurationId { get; set; }
        public DeviceConfiguration? DeviceConfiguration { get; set; }
        public ICollection<DeviceSlave> DeviceSlave { get; set; } = new List<DeviceSlave>();
        public ICollection<OpcUaNode> OpcUaNodes { get; set; } = new List<OpcUaNode>();

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
