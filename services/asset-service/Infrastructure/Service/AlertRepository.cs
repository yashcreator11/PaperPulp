using Application.Interface;
using Domain.Entities;
using Infrastructure.DBs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Service
{
    public class AlertRepository : IAlertRepository
    {
        private readonly DBContext _db;
        private readonly ILogger<AlertRepository> _logger;

        public AlertRepository(DBContext db, ILogger<AlertRepository> logger)
        {
            _db = db ?? throw new ArgumentNullException(nameof(db));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// NEW: Get active alert by SignalId
        /// </summary>
        public async Task<Alert?> GetActiveBySignalAsync(Guid signalId)
        {
            try
            {
                return await _db.Alerts
                    .Where(a => a.SignalId == signalId && a.IsActive)
                    .OrderByDescending(a => a.AlertStartUtc)
                    .FirstOrDefaultAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving active alert for signal {SignalId}", signalId);
                return null;
            }
        }

        /// <summary>
        /// LEGACY: Get active alert by MappingId
        /// </summary>
        public async Task<Alert?> GetActiveAsync(Guid mappingId)
        {
            try
            {
                return await _db.Alerts
                    .Where(x => x.MappingId == mappingId && x.IsActive)
                    .OrderByDescending(x => x.AlertStartUtc)
                    .FirstOrDefaultAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving active alert for mapping {MappingId}", mappingId);
                return null;
            }
        }

        public async Task CreateAsync(Alert alert)
        {
            try
            {
                _db.Alerts.Add(alert);
                await _db.SaveChangesAsync();

                _logger.LogInformation("Created alert {AlertId}", alert.AlertId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating alert");
                throw;
            }
        }

        public async Task UpdateStatsAsync(Guid alertId, double value)
        {
            try
            {
                var alert = await GetByIdAsync(alertId);
                if (alert == null)
                {
                    _logger.LogWarning("Alert {AlertId} not found for update", alertId);
                    return;
                }

                // ✅ Since MinObservedValue & MaxObservedValue are double (not nullable)
                alert.MinObservedValue = Math.Min(alert.MinObservedValue, value);
                alert.MaxObservedValue = Math.Max(alert.MaxObservedValue, value);
                alert.UpdatedUtc = DateTime.UtcNow;

                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating alert stats for {AlertId}", alertId);
                throw;
            }
        }


        public async Task ResolveAsync(Guid alertId, DateTime resolvedUtc)
        {
            try
            {
                var alert = await GetByIdAsync(alertId);
                if (alert == null)
                {
                    _logger.LogWarning("Alert {AlertId} not found for resolution", alertId);
                    return;
                }

                alert.IsActive = false;
                alert.AlertEndUtc = resolvedUtc;
                alert.UpdatedUtc = resolvedUtc;

                await _db.SaveChangesAsync();

                _logger.LogInformation("Resolved alert {AlertId}", alertId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resolving alert {AlertId}", alertId);
                throw;
            }
        }

        public Task<Alert?> GetByIdAsync(Guid alertId)
        {
            return _db.Alerts.FirstOrDefaultAsync(a => a.AlertId == alertId);
        }

        public async Task<List<Alert>> GetUnAnalyzedByAssetAsync(
            Guid assetId,
            DateTime fromUtc,
            DateTime toUtc)
        {
            return await _db.Alerts
                .Where(a =>
                    a.AssetId == assetId &&
                    !a.IsAnalyzed &&
                    !a.IsActive &&
                    a.AlertStartUtc >= fromUtc &&
                    a.AlertEndUtc <= toUtc)
                .ToListAsync();
        }

        public async Task<List<Alert>> GetUnAnalyzedByAssetIDAsync(Guid assetId)
        {
            return await _db.Alerts
                .Where(a =>
                    a.AssetId == assetId &&
                    !a.IsAnalyzed &&
                    !a.IsActive)
                .ToListAsync();
        }

        public async Task MarkResolvedAsync(Guid alertId, DateTime resolvedAt)
        {
            var alert = await GetByIdAsync(alertId);
            if (alert == null) return;

            alert.IsActive = false;
            alert.AlertEndUtc = resolvedAt;
            alert.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync();
        }

        public async Task MarkAnalyzedAsync(IEnumerable<Guid> alertIds)
        {
            var alerts = await _db.Alerts
                .Where(a => alertIds.Contains(a.AlertId))
                .ToListAsync();

            foreach (var alert in alerts)
            {
                alert.IsAnalyzed = true;
                alert.UpdatedUtc = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
        }

        public async Task<List<Alert>> GetAllAsync(
            DateTime? fromUtc,
            DateTime? toUtc,
            Guid assetId)
        {
            var query = _db.Alerts.AsQueryable();

            if (assetId != Guid.Empty)
                query = query.Where(x => x.AssetId == assetId);

            if (fromUtc.HasValue)
                query = query.Where(x => x.AlertStartUtc >= fromUtc.Value);

            if (toUtc.HasValue)
                query = query.Where(x => x.AlertStartUtc <= toUtc.Value);

            return await query
                .OrderByDescending(x => x.AlertStartUtc)
                .ToListAsync();
        }
    }
}
