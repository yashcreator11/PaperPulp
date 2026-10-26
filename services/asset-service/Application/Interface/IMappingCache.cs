using System;

namespace Application.Interface
{
    public class MappingInfo
    {
        public Guid MappingId { get; set; }
        public Guid AssetId { get; init; }
        public Guid DeviceId { get; set; }
        public Guid? DeviceSlaveID { get; set; }

        public Guid SignalId { get; init; }

        public string SignalName { get; init; } = string.Empty;

        public string? SignalUnit { get; set; }

        public double? MinThreshold { get; set; }
        public double? MaxThreshold { get; set; }

        public Guid? RegisterId { get; set; }

        public Guid? OpcUaNodeId { get; set; }
    }

    public interface IMappingCache
    {
        bool TryGetByRegister(Guid deviceId, Guid registerId, out MappingInfo? mapping);

        bool TryGetByOpcUaNode(Guid deviceId, Guid opcUaNodeId, out MappingInfo? mapping);

        Task RefreshAsync(CancellationToken ct = default);
    }
}