using System.ComponentModel.DataAnnotations;
using MyApp.Domain.Entities;

namespace MyApp.Application.Dtos
{
    public class DeviceConfigurationDto
    {
        [Required(ErrorMessage = "Configuration name is required.")]
        [StringLength(100, MinimumLength = 1, ErrorMessage = "Configuration name must be between 1 and 100 characters.")]
        public string Name { get; set; } = null!;

        [Required(ErrorMessage = "Protocol is required.")]
        public DeviceProtocol Protocol { get; set; }

        public string? ConnectionString { get; set; }
        public OpcUaConnectionMode? ConnectionMode { get; set; }

        [Range(100, 300000, ErrorMessage = "Poll interval must be between 100 and 300000 ms.")]
        public int? PollIntervalMs { get; set; }

        public ModbusConnectionMode? ModbusMode { get; set; }

        [Range(0, 247, ErrorMessage = "SlaveId must be between 0 and 247.")]
        public int? SlaveId { get; set; }

        public string? Endian { get; set; }
        public string? IpAddress { get; set; }

        [Range(1, 65535, ErrorMessage = "Port must be between 1 and 65535.")]
        public int? Port { get; set; }

        public string? SerialPort { get; set; }

        [Range(1200, 115200, ErrorMessage = "BaudRate must be between 1200 and 115200.")]
        public int? BaudRate { get; set; }

        public string? Parity { get; set; }
    }
}