namespace Domain.Entities
{
    public class Alert
    {
        public Guid AlertId { get; set; }
        
        public Guid AssetId { get; set; }
        public string AssetName { get; set; } = string.Empty;
        
        public Guid SignalTypeId { get; set; }
        public string SignalName { get; set; } = string.Empty;
        
        // NEW: Primary identifier for alerts
        public Guid SignalId { get; set; }
        
        // OPTIONAL: Keep MappingId for backwards compatibility during migration
        public Guid? MappingId { get; set; }  // Make nullable
        
        public DateTime AlertStartUtc { get; set; }
        public DateTime? AlertEndUtc { get; set; }
        
        public double MinThreshold { get; set; }
        public double MaxThreshold { get; set; }
        
        public double MinObservedValue { get; set; }
        public double MaxObservedValue { get; set; }
        
        public int ReminderTimeHours { get; set; }
        
        public bool IsActive { get; set; }
        public bool IsAnalyzed { get; set; }
        
        public DateTime CreatedUtc { get; set; }
        public DateTime UpdatedUtc { get; set; }
    }
}