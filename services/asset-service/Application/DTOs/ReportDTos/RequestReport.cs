using System;
using System.Collections.Generic;

namespace Application.DTOs.ReportDTos
{
    public class RequestReport
    {
        public Guid AssetID { get; set; }
        public List<Guid> SignalIDs { get; set; } = new();

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public string ReportFormat { get; set; } = string.Empty;
    }
}