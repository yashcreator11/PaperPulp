namespace Application.DTOs
{
    public class NotificationRecipientDto
    {
        public Guid RecipientId { get; set; }
        public Guid NotificationId { get; set; }
        public string Title { get; set; } = "";
        public string Text { get; set; } = "";
        public bool IsRead { get; set; }
        public bool IsAcknowledged { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ReadAt { get; set; }
        public DateTime? AcknowledgedAt { get; set; }
    }
}
