using Application.Interface;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Service
{

    public class MemoryAlertStateStore : IAlertStateStore
    {
        private readonly ConcurrentDictionary<Guid, AlertState> _store = new();
        private readonly ConcurrentDictionary<Guid, SemaphoreSlim> _locks = new();

        private SemaphoreSlim GetLock(Guid id) =>
            _locks.GetOrAdd(id, _ => new SemaphoreSlim(1, 1));

        public async Task<AlertState?> GetAsync(Guid mappingId)
        {
            // Use Task.FromResult to satisfy async/await requirement
            _store.TryGetValue(mappingId, out var s);
            return await Task.FromResult(s);
        }

        public async Task SetActiveAsync(Guid mappingId, DateTime startUtc, double initialValue)
        {
            var sem = GetLock(mappingId);
            await sem.WaitAsync();
            try
            {
                var s = new AlertState
                {
                    MappingId = mappingId,
                    StartUtc = startUtc,
                    MaxValue = initialValue,
                    MinValue = initialValue,
                    IsActive = true,
                    LastUpdatedUtc = startUtc
                };
                _store[mappingId] = s;
            }
            finally { sem.Release(); }
        }

        public async Task UpdateActiveAsync(Guid mappingId, double value, DateTime timestamp)
        {
            var sem = GetLock(mappingId);
            await sem.WaitAsync();
            try
            {
                if (_store.TryGetValue(mappingId, out var s) && s.IsActive)
                {
                    s.MaxValue = Math.Max(s.MaxValue, value);
                    s.MinValue = Math.Min(s.MinValue, value);
                    s.LastUpdatedUtc = timestamp;
                }
            }
            finally { sem.Release(); }
        }

        public async Task<AlertState?> ClearActiveAsync(Guid mappingId, DateTime endUtc)
        {
            var sem = GetLock(mappingId);
            await sem.WaitAsync();
            try
            {
                if (_store.TryRemove(mappingId, out var s))
                {
                    s.IsActive = false; // already removed, but set for clarity
                    return s;
                }
                return null;
            }
            finally { sem.Release(); }
        }
    }
}
