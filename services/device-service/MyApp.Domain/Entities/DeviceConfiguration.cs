using System;
using System.ComponentModel.DataAnnotations;

namespace MyApp.Domain.Entities
{
    public class DeviceConfiguration
    {
        [Key]
        public Guid ConfigurationId { get; set; } = Guid.NewGuid();

        [Required]
        public string Name { get; set; } = null!;

        // Protocol selector
        public DeviceProtocol Protocol { get; set; }

        // OPC UA only
        public string? ConnectionString { get; set; }

        public ModbusConnectionMode? ModbusMode { get; set; }

        public OpcUaConnectionMode? ConnectionMode { get; set; }

        // Polling:
        // Modbus → always used
        // OPC UA → only when Polling
        public int? PollIntervalMs { get; set; } = 1000;

        // MODBUS only
        public string? IpAddress { get; set; }

        public int? Port { get; set; }

        public int? SlaveId { get; set; }

        public string? Endian { get; set; }

        // NEW → MODBUS RTU SERIAL SETTINGS

        public string? SerialPort { get; set; }
        public int? BaudRate { get; set; }
        public string? Parity { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }

    public enum DeviceProtocol
    {
        Modbus = 1,
        OpcUa = 2
    }

    public enum ModbusConnectionMode
    {
        Tcp = 1,
        Rtu = 2
    }

    public enum OpcUaConnectionMode
    {
        Polling = 1,
        PubSub = 2
    }
}
