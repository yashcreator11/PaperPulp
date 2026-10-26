using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.DTOs.ReportDTos
{
    public class ReportQueueItem
    {
        public string AssetId { get; set; } = string.Empty;

        public List<string> SignalIds { get; set; } = new();

        public List<string> MappingIds { get; set; } = new();

        public DateTime StartDate { get; set; }

        public DateTime EndDate { get; set; }

        public string ReportFormat { get; set; } = string.Empty;

        public int TotalRows { get; set; }

        public DateTime RequestedAt { get; set; }
    }
}
