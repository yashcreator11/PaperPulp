public class SignalDto
{
    public Guid SignalId { get; set; }

    public string SignalKey { get; set; } = string.Empty;

    public Guid AssetId { get; set; }

    public Guid DeviceId { get; set; }

    public string SignalName { get; set; } = string.Empty;

    public string? Unit { get; set; }

    public double? MinThreshold { get; set; }

    public double? MaxThreshold { get; set; }
}