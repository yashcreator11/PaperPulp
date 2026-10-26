using System;
using System.ComponentModel.DataAnnotations;

namespace Domain.Entities
{
    public class ReportRequest
    {
        [Key]
        public Guid ReportId { get; set; }

        public Guid AssetId { get; set; }

        public string AssetName { get; set; } = string.Empty;

        public string SignalIds { get; set; } = string.Empty;

        public string FileName { get; set; } = string.Empty;

        public string FilePath { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public DateTime RequestedAt { get; set; }
    }
}