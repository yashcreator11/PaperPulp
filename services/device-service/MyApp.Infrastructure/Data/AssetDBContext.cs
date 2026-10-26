using Microsoft.EntityFrameworkCore;
using MyApp.Domain.Entities;

namespace MyApp.Infrastructure.Data
{
    public class AssetDbContextForDevice : DbContext
    {
        public AssetDbContextForDevice(DbContextOptions<AssetDbContextForDevice> options) : base(options)
        {
        }

        public DbSet<Signal> Signals { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Signal>(entity =>
            {
                entity.ToTable("Signals");
                entity.HasKey(e => e.SignalId);
                entity.Property(e => e.SignalKey).IsRequired();
                entity.Property(e => e.SignalName).IsRequired();
                entity.Property(e => e.MinThreshold);
                entity.Property(e => e.MaxThreshold);
                entity.Property(e => e.RegisterId);
                entity.Property(e => e.OpcUaNodeId);
            });
        }
    }
}