// Infrastructure/Hubs/NotificationHub.cs
using System;
using System.Threading.Tasks;
using Application.Interface;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Hubs
{
    // Keep it Authorize so Context.UserIdentifier is available for server pushes (Clients.User(...))
    [Authorize]
    public class NotificationHub : Hub
    {
        private readonly ILogger<NotificationHub> _log;

        public NotificationHub(ILogger<NotificationHub> log)
        {
            _log = log;
        }

        public override Task OnConnectedAsync()
        {
            _log.LogInformation("SignalR connected: ConnectionId={ConnectionId}, UserIdentifier={UserId}",
                Context.ConnectionId, Context.UserIdentifier);
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception? exception)
        {
            _log.LogInformation("SignalR disconnected: ConnectionId={ConnectionId}, UserIdentifier={UserId}, Exception={Ex}",
                Context.ConnectionId, Context.UserIdentifier, exception?.Message);
            return base.OnDisconnectedAsync(exception);
        }

        // Optional ping for quick health checks
        public Task<string> Ping() => Task.FromResult("pong");
    }
}
