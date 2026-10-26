using Application.Interface;
using Domain.Entities;
using Infrastructure.DBs;
using Microsoft.EntityFrameworkCore;
using System.Collections.Concurrent;

namespace Infrastructure.Service
{
    public class MappingCache : IMappingCache, IDisposable
    {
        private readonly IDbContextFactory<DBContext> _dbFactory;
        private readonly TimeSpan _refreshInterval;
        private readonly CancellationTokenSource _cts = new();

        // Modbus: key = (deviceId, registerId)
        private volatile ConcurrentDictionary<(Guid deviceId, Guid registerId), MappingInfo> _registerCache
            = new();

        // OPC UA: key = (deviceId, opcUaNodeId)
        private volatile ConcurrentDictionary<(Guid deviceId, Guid opcUaNodeId), MappingInfo> _opcUaCache
            = new();

        public MappingCache(IDbContextFactory<DBContext> dbFactory, TimeSpan? refreshInterval = null)
        {
            _dbFactory = dbFactory ?? throw new ArgumentNullException(nameof(dbFactory));
            _refreshInterval = refreshInterval ?? TimeSpan.FromSeconds(5);
            _ = Task.Run(() => RefreshLoopAsync(_cts.Token));
        }

        // Lookup for Modbus
        public bool TryGetByRegister(Guid deviceId, Guid registerId, out MappingInfo? mapping)
            => _registerCache.TryGetValue((deviceId, registerId), out mapping);

        // Lookup for OPC UA
        public bool TryGetByOpcUaNode(Guid deviceId, Guid opcUaNodeId, out MappingInfo? mapping)
            => _opcUaCache.TryGetValue((deviceId, opcUaNodeId), out mapping);

        public async Task RefreshAsync(CancellationToken ct = default)
        {
            using var db = _dbFactory.CreateDbContext();

            var signals = await db.Signals
                .AsNoTracking()
                .Select(s => new
                {
                    s.SignalId,
                    s.AssetId,
                    s.DeviceId,
                    s.SignalName,
                    s.Unit,
                    s.MinThreshold,
                    s.MaxThreshold,
                    s.RegisterId,
                    s.OpcUaNodeId
                })
                .ToListAsync(ct);

            var newRegisterCache = new ConcurrentDictionary<(Guid, Guid), MappingInfo>();
            var newOpcUaCache = new ConcurrentDictionary<(Guid, Guid), MappingInfo>();

            foreach (var s in signals)
            {
                var info = new MappingInfo
                {
                    SignalId = s.SignalId,
                    AssetId = s.AssetId,
                    DeviceId = s.DeviceId,
                    SignalName = s.SignalName,
                    SignalUnit = s.Unit,
                    MinThreshold = s.MinThreshold,
                    MaxThreshold = s.MaxThreshold,
                    RegisterId = s.RegisterId,
                    OpcUaNodeId = s.OpcUaNodeId
                };

                if (s.RegisterId.HasValue)
                    newRegisterCache[(s.DeviceId, s.RegisterId.Value)] = info;

                if (s.OpcUaNodeId.HasValue)
                    newOpcUaCache[(s.DeviceId, s.OpcUaNodeId.Value)] = info;
            }

            _registerCache = newRegisterCache;
            _opcUaCache = newOpcUaCache;
        }

        private async Task RefreshLoopAsync(CancellationToken ct)
        {
            while (!ct.IsCancellationRequested)
            {
                try { await RefreshAsync(ct); }
                catch { /* TODO: log */ }

                try { await Task.Delay(_refreshInterval, ct); }
                catch (OperationCanceledException) { break; }
            }
        }

        public void Dispose()
        {
            _cts.Cancel();
            _cts.Dispose();
        }
    }
}