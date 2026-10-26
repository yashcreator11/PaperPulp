using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class Notification
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string Title { get; set; } = "";
        public string Text { get; set; } = "";

        // Expiry: default to 30 days from creation if not explicitly set
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; }

        // priority / channel / other simple fields you might still want:
        public int Priority { get; set; } = 0;

        // navigation
        public ICollection<NotificationRecipient> Recipients { get; set; } = new List<NotificationRecipient>();

        public Notification()
        {
            // default expiry 30 days
            ExpiresAt = CreatedAt.AddDays(30);
        }
    }
}
