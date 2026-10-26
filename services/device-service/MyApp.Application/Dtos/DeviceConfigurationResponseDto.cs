using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MyApp.Domain.Entities;

namespace MyApp.Application.Dtos
{
    public class DeviceConfigurationResponseDto
    {
        public Guid DeviceId { get; set; }
        public string Name { get; set; } = string.Empty;
        public DeviceProtocol Protocol { get; set; }
        public string? OpcUaMode { get; set; }        // "Polling" or "PubSub" as string
        public int? PollIntervalMs { get; set; }
        public string? ConnectionString { get; set; }
        public string? IpAddress { get; set; }
        public int? Port { get; set; }
        public byte? SlaveId { get; set; }
        public string? Endian { get; set; }
        public string? ModbusMode { get; set; }
        public string? SerialPort { get; set; }
        public int? BaudRate { get; set; }
        public string? Parity { get; set; }
        public List<SlaveDto> Slaves { get; set; } = new();
        public List<OpcUaNodeDto> OpcUaNodes { get; set; } = new();
        // Remove ConnectionMode - replaced by OpcUaMode string
    }
    public class DeviceRegisterDto
    {
        public Guid RegisterId { get; set; }
        public Guid? SignalId { get; set; }
        public int RegisterAddress { get; set; }
        public int RegisterLength { get; set; }
        public string DataType { get; set; } = string.Empty;
        public double Scale { get; set; }
        public string Unit { get; set; } = string.Empty;
        public string ByteOrder { get; set; } = string.Empty;
        public bool WordSwap { get; set; }
        public bool IsHealthy { get; set; }
    }

    public class SlaveDto
    {
        public Guid DeviceSlaveId { get; set; }
        public int SlaveIndex { get; set; }
        public bool IsHealthy { get; set; }
        public List<DeviceRegisterDto> Registers { get; set; } = new();
    }





}