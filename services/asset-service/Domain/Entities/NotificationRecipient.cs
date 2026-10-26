using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{

    public class NotificationRecipient
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid NotificationId { get; set; }
        public Notification Notification { get; set; } = null!;

        // now required — we store the user id for whom this notification was created
        public string UserId { get; set; } = "";

        public bool IsRead { get; set; } = false;
        public bool IsAcknowledged { get; set; } = false;
        public DateTime? ReadAt { get; set; }
        public DateTime? AcknowledgedAt { get; set; }

        // created stamp — useful to determine expiry too (mirror of Notification.CreatedAt)
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
