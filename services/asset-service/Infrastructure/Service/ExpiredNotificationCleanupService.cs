// Services/ExpiredNotificationCleanupService.cs
using Infrastructure.DBs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;


namespace Infrastructure.Service
{
    public class ExpiredNotificationCleanupService : BackgroundService
    {
        private readonly IServiceProvider _svcProvider;
        private readonly ILogger<ExpiredNotificationCleanupService> _log;
        private readonly TimeSpan _runInterval = TimeSpan.FromHours(24); // runs once a day

        public ExpiredNotificationCleanupService(IServiceProvider svcProvider, ILogger<ExpiredNotificationCleanupService> log)
        {
            _svcProvider = svcProvider;
            _log = log;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _log.LogInformation("ExpiredNotificationCleanupService started.");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _svcProvider.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<DBContext>();

                    var now = DateTime.UtcNow;

                    // Delete notifications that are expired
                    var expiredNotifications = await db.Notifications
                        .Where(n => n.ExpiresAt <= now)
                        .ToListAsync(stoppingToken);

                    if (expiredNotifications.Count > 0)
                    {
                        db.Notifications.RemoveRange(expiredNotifications);
                        await db.SaveChangesAsync(stoppingToken);
                        _log.LogInformation("Deleted {Count} expired notifications.", expiredNotifications.Count);
                    }
                    else
                    {
                        _log.LogDebug("No expired notifications to delete.");
                    }
                }
                catch (Exception ex)
                {
                    _log.LogError(ex, "Error while cleaning expired notifications.");
                }

                await Task.Delay(_runInterval, stoppingToken);
            }

            _log.LogInformation("ExpiredNotificationCleanupService stopping.");
        }
    }
}
