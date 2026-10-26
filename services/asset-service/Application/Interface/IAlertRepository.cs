using Domain.Entities;

namespace Application.Interface
{
    public interface IAlertRepository
    {
        Task<Alert?> GetActiveAsync(Guid mappingId);
        Task<Alert?> GetActiveBySignalAsync(Guid signalId);
        Task<Alert?> GetByIdAsync(Guid alertId);

        Task<List<Alert>> GetUnAnalyzedByAssetAsync(Guid assetId, DateTime fromUtc, DateTime toUtc);
        Task<List<Alert>> GetUnAnalyzedByAssetIDAsync(Guid assetId);
        Task<List<Alert>> GetAllAsync(DateTime? fromUtc, DateTime? toUtc, Guid assetId);

        Task CreateAsync(Alert alert);
        Task UpdateStatsAsync(Guid alertId, double value);

        Task ResolveAsync(Guid alertId, DateTime resolvedAt);
        Task MarkResolvedAsync(Guid alertId, DateTime resolvedAt);
        Task MarkAnalyzedAsync(IEnumerable<Guid> alertIds);
    }
}
