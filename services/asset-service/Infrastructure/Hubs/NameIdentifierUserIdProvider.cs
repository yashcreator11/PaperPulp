using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace Infrastructure.Hubs
{
    public class NameIdentifierUserIdProvider : IUserIdProvider
    {
        public string? GetUserId(HubConnectionContext context)
        {
            // Use "UserId" claim directly instead of NameIdentifier
            return context.User?.FindFirst("UserId")?.Value;
        }
    }
}
