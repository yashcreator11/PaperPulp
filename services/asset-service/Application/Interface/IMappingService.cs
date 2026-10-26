using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Application.DTOs;
using Domain.Entities;

namespace Application.Interface
{
    public interface IMappingService
    {
        /// <summary>
        /// Creates mappings between an asset and a device and automatically generates corresponding Signals.
        /// </summary>
        Task<Signal> CreateMapping(CreateMappingDto dto);

        /// <summary>
        /// Updates the thresholds for a specific mapping identified by signalId. This allows setting minimum and maximum values for the signal, which can be used for monitoring and alerting purposes.
        /// </summary>
        /// <param name="signalId"></param>
        /// <param name="min"></param>
        /// <param name="max"></param>
        /// <returns></returns>
        Task<bool> UpdateThresholds(Guid signalId, double? min, double? max);

        /// <summary>
        /// Clears the minimum and maximum thresholds for a specific mapping identified by signalId.
        /// </summary>
        /// <param name="signalId"></param>
        /// <returns></returns>
        Task<Signal> ClearMinMaxThresholds(Guid signalId);

        /// <summary>
        /// Returns all asset-device mappings.
        /// </summary>
        Task<List<Signal>> GetMappings();

        /// <summary>
        /// Unassigns all devices from an asset and deletes the corresponding signals.
        /// </summary>
        Task UnassignDevice(Guid assetId);

        /// <summary>
        /// Gets all signals mapped to a specific asset.
        /// </summary>
        Task<List<Signal>> GetSignalsOnAnAsset(Guid assetId);

        /// <summary>
        /// Deletes a specific mapping by its ID and optionally removes the corresponding signal.
        /// </summary>
        Task<bool> DeleteMappingAsync(Guid signalId);

        /// <summary>
        /// Optional: Get all signals for an asset.
        /// </summary>
        Task<List<Signal>> GetSignalsByAsset(Guid assetId);
    }
}
