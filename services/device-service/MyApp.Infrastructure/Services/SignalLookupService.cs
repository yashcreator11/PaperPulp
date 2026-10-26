using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MyApp.Infrastructure.Data;

namespace MyApp.Infrastructure.Services
{
    public interface ISignalLookupService
    {
        // Modbus: registerId → SignalId
        Task<Dictionary<Guid, Guid>> GetRegisterSignalLookupAsync(Guid deviceId, CancellationToken ct);

        // OPC UA: opcUaNodeId → SignalId
        Task<Dictionary<Guid, Guid>> GetOpcUaSignalLookupAsync(Guid deviceId, CancellationToken ct);
    }

    public class SignalLookupService : ISignalLookupService
    {
        private readonly AssetDbContextForDevice _assetDb;
        private readonly ILogger<SignalLookupService> _log;

        public SignalLookupService(AssetDbContextForDevice assetDb, ILogger<SignalLookupService> log)
        {
            _assetDb = assetDb;
            _log = log;
        }

        public async Task<Dictionary<Guid, Guid>> GetRegisterSignalLookupAsync(
            Guid deviceId, CancellationToken ct)
        {
            try
            {
                var lookup = await _assetDb.Signals
                    .AsNoTracking()
                    .Where(s => s.DeviceId == deviceId && s.RegisterId.HasValue)
                    .ToDictionaryAsync(
                        s => s.RegisterId!.Value,
                        s => s.SignalId,
                        ct);

                _log.LogDebug("Built register signal lookup for device {DeviceId}: {Count} signals",
                    deviceId, lookup.Count);

                return lookup;
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Failed to build register signal lookup for device {DeviceId}", deviceId);
                return new Dictionary<Guid, Guid>();
            }
        }

        public async Task<Dictionary<Guid, Guid>> GetOpcUaSignalLookupAsync(
            Guid deviceId, CancellationToken ct)
        {
            try
            {
                var lookup = await _assetDb.Signals
                    .AsNoTracking()
                    .Where(s => s.DeviceId == deviceId && s.OpcUaNodeId.HasValue)
                    .ToDictionaryAsync(
                        s => s.OpcUaNodeId!.Value,
                        s => s.SignalId,
                        ct);

                _log.LogDebug("Built OPC UA signal lookup for device {DeviceId}: {Count} signals",
                    deviceId, lookup.Count);

                return lookup;
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Failed to build OPC UA signal lookup for device {DeviceId}", deviceId);
                return new Dictionary<Guid, Guid>();
            }
        }
    }
}