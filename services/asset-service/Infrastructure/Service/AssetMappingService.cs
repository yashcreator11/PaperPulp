using Application.Interface;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MappingService.Domain.Entities;
using MappingService.DTOs;
using Infrastructure.DBs;
using Microsoft.EntityFrameworkCore;
using Application.DTOs;
using Domain.Entities;

namespace Infrastructure.Services
{
    public class AssetMappingService : IMappingService
    {
        private readonly DBContext _db;

        public AssetMappingService(DBContext db)
        {
            _db = db;
        }

        public async Task<Signal> CreateMapping(CreateMappingDto dto)
        {
            if (dto == null) throw new ArgumentNullException(nameof(dto));

            if (dto.AssetId == Guid.Empty)
                throw new InvalidOperationException("AssetId is required.");

            if (dto.DeviceId == Guid.Empty)
                throw new InvalidOperationException("DeviceId is required.");

            var isModbus = dto.Register != null;
            var isOpcUa = dto.OpcUaNode != null;

            if (!isModbus && !isOpcUa)
                throw new InvalidOperationException("Either Register or OpcUaNode must be provided.");

            if (isModbus && isOpcUa)
                throw new InvalidOperationException("Cannot map both Register and OpcUaNode in same request.");

            // Check asset exists
            var asset = await _db.Assets.FirstOrDefaultAsync(a => a.AssetId == dto.AssetId && !a.IsDeleted);
            if (asset == null) throw new InvalidOperationException("Asset not found.");

            if (asset.Level < 3)
                throw new InvalidOperationException(
                    $"Mapping is not allowed on this asset. Mappings can only be created on assets at level 3 or deeper (current level: {asset.Level}).");

            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                Signal signal;

                if (isModbus)
                {
                    var reg = dto.Register!;

                    // Check not already mapped
                    var alreadyMapped = await _db.Signals
                        .AnyAsync(s => s.RegisterId == reg.RegisterId);
                    if (alreadyMapped)
                        throw new InvalidOperationException("This register is already mapped.");

                    // Check signal name not already used on this asset+device
                    var nameConflict = await _db.Signals
                        .AnyAsync(s => s.AssetId == dto.AssetId &&
                                       s.DeviceId == dto.DeviceId &&
                                       s.SignalName.ToLower() == reg.SignalName.ToLower());
                    if (nameConflict)
                        throw new InvalidOperationException(
                            $"Signal '{reg.SignalName}' already exists on this asset.");

                    signal = new Signal
                    {
                        SignalId = Guid.NewGuid(),
                        SignalKey = $"{dto.AssetId}.{dto.DeviceId}.{reg.SignalName}",
                        AssetId = dto.AssetId,
                        DeviceId = dto.DeviceId,
                        SignalName = reg.SignalName.Trim(),
                        Unit = reg.Unit,
                        MinThreshold = reg.MinThreshold,
                        MaxThreshold = reg.MaxThreshold,
                        RegisterId = reg.RegisterId,
                        OpcUaNodeId = null,
                        CreatedAt = DateTime.UtcNow
                    };
                }
                else
                {
                    var node = dto.OpcUaNode!;

                    // Check not already mapped
                    var alreadyMapped = await _db.Signals
                        .AnyAsync(s => s.OpcUaNodeId == node.OpcUaNodeId);
                    if (alreadyMapped)
                        throw new InvalidOperationException("This OPC UA node is already mapped.");

                    // Check signal name not already used on this asset+device
                    var nameConflict = await _db.Signals
                        .AnyAsync(s => s.AssetId == dto.AssetId &&
                                       s.DeviceId == dto.DeviceId &&
                                       s.SignalName.ToLower() == node.SignalName.ToLower());
                    if (nameConflict)
                        throw new InvalidOperationException(
                            $"Signal '{node.SignalName}' already exists on this asset.");

                    signal = new Signal
                    {
                        SignalId = Guid.NewGuid(),
                        SignalKey = $"{dto.AssetId}.{dto.DeviceId}.{node.SignalName}",
                        AssetId = dto.AssetId,
                        DeviceId = dto.DeviceId,
                        SignalName = node.SignalName.Trim(),
                        Unit = node.Unit,
                        MinThreshold = node.MinThreshold,
                        MaxThreshold = node.MaxThreshold,
                        RegisterId = null,
                        OpcUaNodeId = node.OpcUaNodeId,
                        CreatedAt = DateTime.UtcNow
                    };
                }

                _db.Signals.Add(signal);
                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                return signal;
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<Signal> ClearMinMaxThresholds(Guid signalId)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();
            try
            {
                var signal = await _db.Signals.FirstOrDefaultAsync(s => s.SignalId == signalId);
                if (signal == null)
                    throw new InvalidOperationException("Signal not found.");

                signal.MinThreshold = null;
                signal.MaxThreshold = null;

                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                return signal;
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<bool> UpdateThresholds(Guid signalId, double? min, double? max)
        {
            if (min.HasValue && max.HasValue && min.Value > max.Value)
                throw new InvalidOperationException("MinThreshold cannot be greater than MaxThreshold.");

            var signal = await _db.Signals.FirstOrDefaultAsync(s => s.SignalId == signalId);
            if (signal == null)
                return false;
            signal.MinThreshold = min;
            signal.MaxThreshold = max;
            await _db.SaveChangesAsync();
            return true;
        }
        public async Task<List<Signal>> GetMappings()
        {
            return await _db.Signals.ToListAsync();
        }

        public async Task UnassignDevice(Guid assetId)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();

            var assetExists = await _db.Assets.AnyAsync(a => a.AssetId == assetId);
            if (!assetExists) throw new Exception("Asset not found.");

            var signalsToDelete = await _db.Signals
                .Where(s => s.AssetId == assetId)
                .ToListAsync();

            if (!signalsToDelete.Any()) throw new Exception("No signals mapped to this asset.");

            _db.Signals.RemoveRange(signalsToDelete);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
        }

        public async Task<List<Signal>> GetSignalsOnAnAsset(Guid assetId)
        {

            var assetExists = await _db.Assets.AnyAsync(a => a.AssetId == assetId);
            if (!assetExists)
                return new List<Signal>();

            return await _db.Signals
                .Where(s => s.AssetId == assetId)
                .ToListAsync();


        }

        public async Task<bool> DeleteMappingAsync(Guid signalId)
        {

            var signal = await _db.Signals
                .FirstOrDefaultAsync(s => s.SignalId == signalId);

            if (signal == null)
                return false;

            _db.Signals.Remove(signal);
            await _db.SaveChangesAsync();

            return true;


        }

        public async Task<List<Signal>> GetSignalsByAsset(Guid assetId)
        {

            var signals = await _db.Signals
                .Where(s => s.AssetId == assetId)
                .ToListAsync();
 
            return signals;

        }
    }
}