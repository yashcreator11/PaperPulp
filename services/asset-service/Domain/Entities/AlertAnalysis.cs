using System;

namespace Domain.Entities
{
    public class AlertAnalysis
    {
        public Guid AlertAnalysisId { get; set; }

        public Guid AssetId { get; set; }

        public string AssetName { get; set; } = string.Empty;

        public DateTime FromUtc { get; set; }

        public DateTime ToUtc { get; set; }

        public string RecommendedActions { get; set; } = string.Empty;

        public DateTime AnalyzedAtUtc { get; set; }
    }
}