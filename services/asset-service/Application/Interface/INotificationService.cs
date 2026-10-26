using Application.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;


public record NotificationCreateRequest(
    string Title,
    string Text,
    DateTime? ExpiresAt = null,
    int Priority = 0
);

public record NotificationDto(
    Guid Id,
    string Title,
    string Text,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    int Priority
);

namespace Application.Interface
{
    public interface INotificationService
    {
        Task<NotificationDto> CreateForUsersAsync(NotificationCreateRequest req);
        Task<bool> MarkAsReadAsync(Guid recipientId, string userId);
        Task<bool> AcknowledgeAsync(Guid recipientId, string userId);
        Task<CursorResult<NotificationDto>> GetAllNotificationsCursorAsync(
    DateTime? cursor,
    int limit
);

        Task<CursorResult<NotificationRecipientDto>> GetForUserCursorAsync(
                   string userId,
                   bool unreadOnly,
                   DateTime? cursor,
                   int limit
               );
        Task<bool> MarkAllAsReadAsync(string userId);


    }
}



