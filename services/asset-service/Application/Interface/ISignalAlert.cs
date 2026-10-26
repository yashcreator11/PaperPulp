using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interface
{

    public class AlertState
    {
        public Guid MappingId { get; set; }             // or string key
        public DateTime StartUtc { get; set; }
        public double MaxValue { get; set; }
        public double MinValue { get; set; }
        public bool IsActive { get; set; }
        public DateTime LastUpdatedUtc { get; set; }
    }

    public interface IAlertStateStore
    {
        Task<AlertState?> GetAsync(Guid mappingId);
        Task SetActiveAsync(Guid mappingId, DateTime startUtc, double initialValue);
        Task UpdateActiveAsync(Guid mappingId, double value, DateTime timestamp);
        Task<AlertState?> ClearActiveAsync(Guid mappingId, DateTime endUtc);
    }
}
