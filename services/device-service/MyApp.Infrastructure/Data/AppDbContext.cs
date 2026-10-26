using Microsoft.EntityFrameworkCore;
using MyApp.Domain.Entities;


namespace MyApp.Infrastructure.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> opts) : base(opts) { }

        public DbSet<Device> Devices => Set<Device>();
        public DbSet<DeviceConfiguration> DeviceConfigurations => Set<DeviceConfiguration>();
        public DbSet<DeviceSlave> DeviceSlaves => Set<DeviceSlave>();
        public DbSet<Register> Registers => Set<Register>();
        public DbSet<OpcUaNode> OpcUaNodes => Set<OpcUaNode>(); 

        public DbSet<ApiLog> ApiLogs => Set<ApiLog>();

         public DbSet<Gateway> Gateway => Set<Gateway>();

            protected override void OnModelCreating(ModelBuilder mb)
        {
            // DEVICE
            mb.Entity<Device>()
              .HasKey(d => d.DeviceId);

            // // Store Protocol as string in the database
            // mb.Entity<Device>()
            //     .Property(d => d.Protocol)
            //     .HasConversion<string>();

            // // DEVICE CONFIGURATION - Store Protocol as string in the database
            // mb.Entity<DeviceConfiguration>()
            //     .Property(dc => dc.Protocol)
            //     .HasConversion<string>();

            // Device → DeviceSlaves
            mb.Entity<Device>()
              .HasMany(d => d.DeviceSlave)
              .WithOne(dp => dp.Device)
              .HasForeignKey(dp => dp.DeviceId)
              .OnDelete(DeleteBehavior.Cascade);

            // DEVICE PORT
            mb.Entity<DeviceSlave>()
                .HasKey(dp => dp.deviceSlaveId);

            // slaveIndex must be unique per device
            mb.Entity<DeviceSlave>()
                .HasIndex(dp => new { dp.DeviceId, dp.slaveIndex })
                .IsUnique();

            // DeviceSlave → Registers
            mb.Entity<DeviceSlave>()
                .HasMany(dp => dp.Registers)
                .WithOne(r => r.DeviceSlave)
                .HasForeignKey(r => r.deviceSlaveId)
                .IsRequired()
                .OnDelete(DeleteBehavior.Cascade);

            // REGISTER
            mb.Entity<Register>()
                .HasKey(r => r.RegisterId);

            // RegisterAddress must be unique per DeviceSlave
            mb.Entity<Register>()
                .HasIndex(r => new { r.deviceSlaveId, r.RegisterAddress })
                .IsUnique();
            
            // In AppDbContext.cs OnModelCreating method
            mb.Entity<OpcUaNode>(entity =>
            {
                entity.HasKey(e => e.OpcUaNodeId);
                
                entity.Property(e => e.NodeId)
                    .IsRequired()
                    .HasMaxLength(500);
                
                entity.Property(e => e.SignalName)
                    .IsRequired()
                    .HasMaxLength(200);
                
                entity.Property(e => e.DataType)
                    .IsRequired()
                    .HasMaxLength(50);
                
                entity.Property(e => e.Unit)
                    .HasMaxLength(20);
                
                entity.Property(e => e.ScalingFactor)
                    .HasDefaultValue(1.0);

                // Unique constraint: One NodeId per Device
                entity.HasIndex(e => new { e.DeviceId, e.NodeId })
                    .IsUnique();
            });

            base.OnModelCreating(mb);
        }
    }
}
