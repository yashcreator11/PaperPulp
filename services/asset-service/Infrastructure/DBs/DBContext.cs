using Domain.Entities;
using MappingService.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System;

namespace Infrastructure.DBs
{
    public class DBContext : DbContext
    {
        public DBContext(DbContextOptions<DBContext> options) : base(options) { }

        public DbSet<Asset> Assets { get; set; } = null!;

        public DbSet<Notification> Notifications { get; set; } = null!;
        public DbSet<NotificationRecipient> NotificationRecipients { get; set; } = null!;

        public DbSet<ReportRequest> ReportRequests { get; set; }
        public DbSet<Alert> Alerts { get; set; } = null!;
        public DbSet<AlertAnalysis> AlertAnalyses { get; set; }
        public DbSet<Signal> Signals { get; set; } = null!;




        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Asset>()
                .HasMany(a => a.Childrens)
                .WithOne()
                .HasForeignKey(a => a.ParentId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Asset>()
                .HasIndex(a => a.Name)
                .IsUnique();

            



            modelBuilder.Entity<Notification>(b =>
            {
                b.HasKey(n => n.Id);
                b.Property(n => n.Title).HasMaxLength(250).IsRequired();
                b.Property(n => n.Text).IsRequired();
                b.Property(n => n.CreatedAt).IsRequired();
                b.Property(n => n.ExpiresAt).IsRequired();
                b.HasMany(n => n.Recipients)
                 .WithOne(r => r.Notification)
                 .HasForeignKey(r => r.NotificationId)
                 .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<NotificationRecipient>(b =>
            {
                b.HasKey(r => r.Id);
                b.Property(r => r.UserId).HasMaxLength(200).IsRequired();
                b.Property(r => r.CreatedAt).IsRequired();
                b.HasIndex(r => new { r.UserId, r.CreatedAt });
            });

            modelBuilder.Entity<Alert>(b =>
           {
               b.HasKey(a => a.AlertId);

               b.Property(a => a.AssetName)
                   .HasMaxLength(200)
                   .IsRequired();

               b.Property(a => a.SignalName)
                   .HasMaxLength(200)
                   .IsRequired();

               // ✅ For analyzed filtering
               b.HasIndex(a => new { a.AssetId, a.IsAnalyzed });

               // ✅ LEGACY support
               b.HasIndex(a => new { a.MappingId, a.IsActive });

               // ✅ NEW (VERY IMPORTANT)
               b.HasIndex(a => new { a.SignalId, a.IsActive })
                   .HasDatabaseName("IX_Alert_Signal_Active");

               // Optional but recommended
               b.HasIndex(a => a.AlertStartUtc);
           });



            modelBuilder.Entity<AlertAnalysis>(b =>
            {
                b.HasKey(a => a.AlertAnalysisId);

                b.Property(a => a.RecommendedActions).IsRequired();

            });

            modelBuilder.Entity<Signal>(b =>
            {
                b.HasKey(s => s.SignalId);

                b.Property(s => s.SignalKey)
                    .HasMaxLength(500)
                    .IsRequired();

                b.Property(s => s.SignalName)
                    .HasMaxLength(200)
                    .IsRequired();

                b.Property(s => s.Unit)
                    .HasMaxLength(50);

                b.Property(s => s.CreatedAt)
                    .IsRequired();

                b.Property(s => s.MinThreshold);
                b.Property(s => s.MaxThreshold);
                b.Property(s => s.RegisterId);
                b.Property(s => s.OpcUaNodeId);

                b.HasIndex(s => new { s.AssetId, s.DeviceId, s.SignalKey })
                    .IsUnique()
                    .HasDatabaseName("UX_Signal_AssetDeviceKey");

                // ONE index on DeviceId for unmapped device queries
                b.HasIndex(s => s.DeviceId)
                    .HasDatabaseName("IX_Signal_DeviceId");
            });




        }
    }
}