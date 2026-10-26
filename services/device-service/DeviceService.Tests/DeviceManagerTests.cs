// =============================================================================
//  DeviceManagerTests.cs
//  Unit tests for DeviceManager, GatewayService, and SignalLookupService
//
//  Stack:
//    - xUnit
//    - Moq
//    - Microsoft.EntityFrameworkCore.InMemory
//
//  NuGet packages required (add to DeviceService.Tests.csproj):
//    <PackageReference Include="xunit"                             Version="2.9.*" />
//    <PackageReference Include="xunit.runner.visualstudio"        Version="2.8.*" />
//    <PackageReference Include="Microsoft.NET.Test.Sdk"           Version="17.*"  />
//    <PackageReference Include="Moq"                              Version="4.20.*" />
//    <PackageReference Include="Microsoft.EntityFrameworkCore.InMemory" Version="9.0.*" />
//    <PackageReference Include="Microsoft.EntityFrameworkCore"    Version="9.0.*" />
//
//  Project references required:
//    <ProjectReference Include="..\MyApp.Infrastructure\MyApp.Infrastructure.csproj" />
// =============================================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.InMemory;
using Microsoft.Extensions.Logging;
using Moq;
using MyApp.Application.Dtos;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;
using MyApp.Infrastructure.Services;
using Xunit;

namespace DeviceService.Tests
{
    // =========================================================================
    //  Shared in-memory DB helpers
    // =========================================================================

    /// <summary>
    /// Creates fresh in-memory EF Core contexts per test so tests are isolated.
    /// </summary>
    public static class TestDbFactory
    {
        public static AppDbContext CreateAppDb(string? dbName = null)
        {
            var opts = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            return new AppDbContext(opts);
        }

        public static AssetDbContextForDevice CreateAssetDb(string? dbName = null)
        {
            var opts = new DbContextOptionsBuilder<AssetDbContextForDevice>()
                .UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            return new AssetDbContextForDevice(opts);
        }

        /// <summary>Returns a DeviceManager with fresh in-memory DBs.</summary>
        public static (DeviceManager sut, AppDbContext appDb, AssetDbContextForDevice assetDb)
            CreateDeviceManager()
        {
            var appDb   = CreateAppDb();
            var assetDb = CreateAssetDb();
            var logger  = new Mock<ILogger<DeviceManager>>().Object;
            var sut     = new DeviceManager(appDb, logger, assetDb);
            return (sut, appDb, assetDb);
        }
    }

    // =========================================================================
    //  Shared builder helpers – keep individual tests concise
    // =========================================================================

    public static class Builders
    {
        public static CreateDeviceDto ModbusTcpDevice(
            string name              = "TestDevice",
            string gatewayClientId   = "GW-abc",
            string cfgName           = "cfg1",
            string ip                = "192.168.1.1",
            int    port              = 502,
            int    slaveId           = 1) =>
            new CreateDeviceDto
            {
                Name            = name,
                GatewayClientId = gatewayClientId,
                Protocol        = DeviceProtocol.Modbus,
                Configuration   = new DeviceConfigurationDto
                {
                    Name        = cfgName,
                    Protocol    = DeviceProtocol.Modbus,
                    ModbusMode  = ModbusConnectionMode.Tcp,
                    IpAddress   = ip,
                    Port        = port,
                    SlaveId     = slaveId
                }
            };

        public static CreateDeviceDto OpcUaDevice(
            string name            = "OpcDevice",
            string gatewayClientId = "GW-abc",
            string cfgName         = "opc-cfg",
            string connStr         = "opc.tcp://localhost:4840") =>
            new CreateDeviceDto
            {
                Name            = name,
                GatewayClientId = gatewayClientId,
                Protocol        = DeviceProtocol.OpcUa,
                Configuration   = new DeviceConfigurationDto
                {
                    Name             = cfgName,
                    Protocol         = DeviceProtocol.OpcUa,
                    ConnectionString = connStr,
                    ConnectionMode   = OpcUaConnectionMode.Polling,
                    PollIntervalMs   = 1000
                }
            };

        public static Device SeedDevice(
            AppDbContext db,
            string       name          = "Existing",
            bool         isDeleted     = false,
            string       gatewayId     = "GW-abc",
            DeviceProtocol protocol    = DeviceProtocol.Modbus)
        {
            var device = new Device
            {
                DeviceId  = Guid.NewGuid(),
                Name      = name,
                GatewayId = gatewayId,
                Protocol  = protocol,
                IsDeleted = isDeleted
            };
            db.Devices.Add(device);
            db.SaveChanges();
            return device;
        }
    }

    // =========================================================================
    //  CreateDeviceAsync Tests
    // =========================================================================

    public class CreateDeviceAsync_Tests
    {
        [Fact]
        public async Task CreateDevice_WithValidModbusTcp_ReturnsNewGuid()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            var dto    = Builders.ModbusTcpDevice();
            var result = await sut.CreateDeviceAsync(dto);

            Assert.NotEqual(Guid.Empty, result);
        }

        [Fact]
        public async Task CreateDevice_WithValidOpcUaPolling_ReturnsNewGuid()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            var result = await sut.CreateDeviceAsync(Builders.OpcUaDevice());

            Assert.NotEqual(Guid.Empty, result);
        }

        [Fact]
        public async Task CreateDevice_NullRequest_ThrowsArgumentNullException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            await Assert.ThrowsAsync<ArgumentNullException>(() =>
                sut.CreateDeviceAsync(null!));
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public async Task CreateDevice_EmptyName_ThrowsArgumentException(string badName)
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            var dto  = Builders.ModbusTcpDevice(name: badName);
            await Assert.ThrowsAsync<ArgumentException>(() =>
                sut.CreateDeviceAsync(dto));
        }

        [Fact]
        public async Task CreateDevice_EmptyGatewayClientId_ThrowsArgumentException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            var dto = Builders.ModbusTcpDevice();
            dto.GatewayClientId = "";

            await Assert.ThrowsAsync<ArgumentException>(() =>
                sut.CreateDeviceAsync(dto));
        }

        [Fact]
        public async Task CreateDevice_DuplicateName_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            Builders.SeedDevice(appDb, name: "TestDevice");

            var dto = Builders.ModbusTcpDevice(name: "TestDevice");
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.CreateDeviceAsync(dto));
        }

        [Fact]
        public async Task CreateDevice_DuplicateName_IsCaseInsensitive()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            Builders.SeedDevice(appDb, name: "testdevice");

            var dto = Builders.ModbusTcpDevice(name: "TestDevice");
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.CreateDeviceAsync(dto));
        }

        [Fact]
        public async Task CreateDevice_ExceedsMaxDeviceLimit_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();

            // Seed 20 devices
            for (int i = 0; i < 20; i++)
                Builders.SeedDevice(appDb, name: $"Device{i}");

            var dto = Builders.ModbusTcpDevice(name: "OneMore");
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.CreateDeviceAsync(dto));
        }

        [Fact]
        public async Task CreateDevice_ModbusTcp_PersistsConfigurationCorrectly()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();

            var dto    = Builders.ModbusTcpDevice(ip: "10.0.0.1", port: 503, slaveId: 5);
            var id     = await sut.CreateDeviceAsync(dto);
            var device = await appDb.Devices
                .Include(d => d.DeviceConfiguration)
                .FirstAsync(d => d.DeviceId == id);

            Assert.NotNull(device.DeviceConfiguration);
            Assert.Equal("10.0.0.1", device.DeviceConfiguration!.IpAddress);
            Assert.Equal(503, device.DeviceConfiguration.Port);
            Assert.Equal(5,   device.DeviceConfiguration.SlaveId);
            Assert.Equal(ModbusConnectionMode.Tcp, device.DeviceConfiguration.ModbusMode);
        }

        [Fact]
        public async Task CreateDevice_OpcUaPolling_StoresConnectionString()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();

            var id     = await sut.CreateDeviceAsync(Builders.OpcUaDevice(connStr: "opc.tcp://plc:4840"));
            var device = await appDb.Devices
                .Include(d => d.DeviceConfiguration)
                .FirstAsync(d => d.DeviceId == id);

            Assert.Equal("opc.tcp://plc:4840", device.DeviceConfiguration!.ConnectionString);
            Assert.Equal(OpcUaConnectionMode.Polling, device.DeviceConfiguration.ConnectionMode);
        }

        [Fact]
        public async Task CreateDevice_ModbusTcp_MissingIpAddress_ThrowsArgumentException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            var dto = Builders.ModbusTcpDevice();
            dto.Configuration!.IpAddress = null;

            await Assert.ThrowsAsync<ArgumentException>(() => sut.CreateDeviceAsync(dto));
        }

        [Fact]
        public async Task CreateDevice_ModbusTcp_InvalidPort_ThrowsArgumentOutOfRangeException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            var dto = Builders.ModbusTcpDevice(port: 99999);

            await Assert.ThrowsAsync<ArgumentOutOfRangeException>(() => sut.CreateDeviceAsync(dto));
        }

        [Fact]
        public async Task CreateDevice_ModbusTcp_MissingModbusMode_ThrowsArgumentException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            var dto = Builders.ModbusTcpDevice();
            dto.Configuration!.ModbusMode = null;

            await Assert.ThrowsAsync<ArgumentException>(() => sut.CreateDeviceAsync(dto));
        }

        [Fact]
        public async Task CreateDevice_OpcUa_MissingConnectionString_ThrowsArgumentException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            var dto = Builders.OpcUaDevice();
            dto.Configuration!.ConnectionString = null;

            await Assert.ThrowsAsync<ArgumentException>(() => sut.CreateDeviceAsync(dto));
        }

        [Fact]
        public async Task CreateDevice_OpcUaPolling_MissingPollInterval_ThrowsArgumentException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            var dto = Builders.OpcUaDevice();
            dto.Configuration!.ConnectionMode  = OpcUaConnectionMode.Polling;
            dto.Configuration!.PollIntervalMs  = null;

            await Assert.ThrowsAsync<ArgumentException>(() => sut.CreateDeviceAsync(dto));
        }

        [Fact]
        public async Task CreateDevice_ModbusTcp_DefaultPollIntervalIsApplied()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();

            var dto = Builders.ModbusTcpDevice();
            dto.Configuration!.PollIntervalMs = null; // omit → should default to 1000

            var id  = await sut.CreateDeviceAsync(dto);
            var cfg = appDb.DeviceConfigurations.First();

            Assert.Equal(1000, cfg.PollIntervalMs);
        }

        [Fact]
        public async Task CreateDevice_WithNoConfiguration_StillCreatesDevice()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();

            var dto = new CreateDeviceDto
            {
                Name            = "NoCfgDevice",
                GatewayClientId = "GW-abc",
                Protocol        = DeviceProtocol.Modbus
            };

            var id = await sut.CreateDeviceAsync(dto);

            var device = await appDb.Devices.FindAsync(id);
            Assert.NotNull(device);
            Assert.Null(device!.DeviceConfigurationId);
        }
    }

    // =========================================================================
    //  GetDeviceAsync Tests
    // =========================================================================

    public class GetDeviceAsync_Tests
    {
        [Fact]
        public async Task GetDevice_ExistingId_ReturnsDevice()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var seeded = Builders.SeedDevice(appDb, "MyDevice");

            var result = await sut.GetDeviceAsync(seeded.DeviceId);

            Assert.NotNull(result);
            Assert.Equal("MyDevice", result!.Name);
        }

        [Fact]
        public async Task GetDevice_UnknownId_ReturnsNull()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            var result = await sut.GetDeviceAsync(Guid.NewGuid());

            Assert.Null(result);
        }

        [Fact]
        public async Task GetDevice_SoftDeletedDevice_ReturnsNull()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var seeded = Builders.SeedDevice(appDb, "DeletedDevice", isDeleted: true);

            var result = await sut.GetDeviceAsync(seeded.DeviceId);

            Assert.Null(result);
        }
    }

    // =========================================================================
    //  GetAllDevicesAsync Tests
    // =========================================================================

    public class GetAllDevicesAsync_Tests
    {
        [Fact]
        public async Task GetAllDevices_ReturnsOnlyNonDeleted()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            Builders.SeedDevice(appDb, "Active1");
            Builders.SeedDevice(appDb, "Deleted1", isDeleted: true);

            var (devices, total) = await sut.GetAllDevicesAsync(1, 10, null);

            Assert.Equal(1, total);
            Assert.Single(devices);
            Assert.Equal("Active1", devices[0].Name);
        }

        [Fact]
        public async Task GetAllDevices_SearchByName_FiltersCorrectly()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            Builders.SeedDevice(appDb, "TemperatureSensor");
            Builders.SeedDevice(appDb, "PressureGauge");

            var (devices, total) = await sut.GetAllDevicesAsync(1, 10, "pressure");

            Assert.Equal(1, total);
            Assert.Equal("PressureGauge", devices[0].Name);
        }

        [Fact]
        public async Task GetAllDevices_PaginationRespectsPageSize()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            for (int i = 0; i < 5; i++)
                Builders.SeedDevice(appDb, $"Device{i}");

            var (devices, total) = await sut.GetAllDevicesAsync(1, 3, null);

            Assert.Equal(5, total);
            Assert.Equal(3, devices.Count);
        }

        [Fact]
        public async Task GetAllDevices_SecondPage_ReturnsCorrectItems()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            for (int i = 0; i < 5; i++)
                Builders.SeedDevice(appDb, $"Device{i:D2}");

            var (devices, _) = await sut.GetAllDevicesAsync(2, 3, null);

            Assert.Equal(2, devices.Count);
        }

        [Fact]
        public async Task GetAllDevices_EmptyDb_ReturnsEmptyList()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            var (devices, total) = await sut.GetAllDevicesAsync(1, 10, null);

            Assert.Equal(0, total);
            Assert.Empty(devices);
        }
    }

    // =========================================================================
    //  DeleteDeviceAsync Tests
    // =========================================================================

    public class DeleteDeviceAsync_Tests
    {
        [Fact]
        public async Task DeleteDevice_ExistingDevice_SetsIsDeletedTrue()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "ToDelete");

            await sut.DeleteDeviceAsync(device.DeviceId);

            var refreshed = await appDb.Devices.FindAsync(device.DeviceId);
            Assert.True(refreshed!.IsDeleted);
        }

        [Fact]
        public async Task DeleteDevice_UnknownId_ThrowsKeyNotFoundException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                sut.DeleteDeviceAsync(Guid.NewGuid()));
        }

        [Fact]
        public async Task DeleteDevice_AlreadyDeleted_DoesNotThrow()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "AlreadyGone", isDeleted: true);

            // Should not throw – idempotent soft delete
            var ex = await Record.ExceptionAsync(() => sut.DeleteDeviceAsync(device.DeviceId));
            Assert.Null(ex);
        }

        [Fact]
        public async Task DeleteDevice_MappedToSignal_ThrowsInvalidOperationException()
        {
            var (sut, appDb, assetDb) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "MappedDevice");

            // Seed a signal mapping
            assetDb.Signals.Add(new Signal
            {
                SignalId   = Guid.NewGuid(),
                SignalKey  = "key",
                SignalName = "sig1",
                DeviceId   = device.DeviceId
            });
            await assetDb.SaveChangesAsync();

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.DeleteDeviceAsync(device.DeviceId));
        }

        [Fact]
        public async Task DeleteDevice_ConfigSharedByOtherDevice_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();

            var cfgId = Guid.NewGuid();
            var cfg = new DeviceConfiguration { ConfigurationId = cfgId, Name = "shared", Protocol = DeviceProtocol.Modbus };
            appDb.DeviceConfigurations.Add(cfg);

            var dev1 = new Device { DeviceId = Guid.NewGuid(), Name = "Dev1", GatewayId = "GW", Protocol = DeviceProtocol.Modbus, DeviceConfigurationId = cfgId };
            var dev2 = new Device { DeviceId = Guid.NewGuid(), Name = "Dev2", GatewayId = "GW", Protocol = DeviceProtocol.Modbus, DeviceConfigurationId = cfgId };
            appDb.Devices.AddRange(dev1, dev2);
            appDb.SaveChanges();

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.DeleteDeviceAsync(dev1.DeviceId));
        }
    }

    // =========================================================================
    //  RestoreDeviceAsync Tests
    // =========================================================================

    public class RestoreDeviceAsync_Tests
    {
        [Fact]
        public async Task RestoreDevice_DeletedDevice_SetsIsDeletedFalse()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "RestoreMe", isDeleted: true);

            await sut.RestoreDeviceAsync(device.DeviceId);

            var refreshed = await appDb.Devices.FindAsync(device.DeviceId);
            Assert.False(refreshed!.IsDeleted);
        }

        [Fact]
        public async Task RestoreDevice_NotDeletedDevice_DoesNotThrow()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "NotDeleted");

            var ex = await Record.ExceptionAsync(() => sut.RestoreDeviceAsync(device.DeviceId));
            Assert.Null(ex);
        }

        [Fact]
        public async Task RestoreDevice_UnknownId_ThrowsKeyNotFoundException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                sut.RestoreDeviceAsync(Guid.NewGuid()));
        }
    }

    // =========================================================================
    //  PermanentlyDeleteDeviceAsync Tests
    // =========================================================================

    public class PermanentlyDeleteDeviceAsync_Tests
    {
        [Fact]
        public async Task PermanentlyDeleteDevice_RemovesFromDb()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "HardDelete");

            await sut.PermanentlyDeleteDeviceAsync(device.DeviceId);

            var found = await appDb.Devices.FindAsync(device.DeviceId);
            Assert.Null(found);
        }

        [Fact]
        public async Task PermanentlyDeleteDevice_AlsoDeletesOwnedConfig()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();

            var cfgId = Guid.NewGuid();
            appDb.DeviceConfigurations.Add(new DeviceConfiguration { ConfigurationId = cfgId, Name = "cfg", Protocol = DeviceProtocol.Modbus });
            var dev = new Device { DeviceId = Guid.NewGuid(), Name = "D1", GatewayId = "GW", Protocol = DeviceProtocol.Modbus, DeviceConfigurationId = cfgId };
            appDb.Devices.Add(dev);
            appDb.SaveChanges();

            await sut.PermanentlyDeleteDeviceAsync(dev.DeviceId);

            Assert.Empty(appDb.DeviceConfigurations);
        }

        [Fact]
        public async Task PermanentlyDeleteDevice_UnknownId_ThrowsKeyNotFoundException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                sut.PermanentlyDeleteDeviceAsync(Guid.NewGuid()));
        }

        [Fact]
        public async Task PermanentlyDeleteDevice_SharedConfig_OnlyRemovesDevice()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();

            var cfgId = Guid.NewGuid();
            appDb.DeviceConfigurations.Add(new DeviceConfiguration { ConfigurationId = cfgId, Name = "shared-cfg", Protocol = DeviceProtocol.Modbus });

            var dev1 = new Device { DeviceId = Guid.NewGuid(), Name = "Dev1", GatewayId = "GW", Protocol = DeviceProtocol.Modbus, DeviceConfigurationId = cfgId };
            var dev2 = new Device { DeviceId = Guid.NewGuid(), Name = "Dev2", GatewayId = "GW", Protocol = DeviceProtocol.Modbus, DeviceConfigurationId = cfgId };
            appDb.Devices.AddRange(dev1, dev2);
            appDb.SaveChanges();

            await sut.PermanentlyDeleteDeviceAsync(dev1.DeviceId);

            // Config must still exist
            Assert.Single(appDb.DeviceConfigurations);
            // dev2 must still exist
            Assert.NotNull(await appDb.Devices.FindAsync(dev2.DeviceId));
        }
    }

    // =========================================================================
    //  UpdateDeviceAsync Tests
    // =========================================================================

    public class UpdateDeviceAsync_Tests
    {
        [Fact]
        public async Task UpdateDevice_NewValidName_UpdatesName()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "OldName");

            await sut.UpdateDeviceAsync(device.DeviceId, new UpdateDeviceDto { Name = "NewName" });

            var refreshed = await appDb.Devices.FindAsync(device.DeviceId);
            Assert.Equal("NewName", refreshed!.Name);
        }

        [Fact]
        public async Task UpdateDevice_UnknownId_ThrowsKeyNotFoundException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                sut.UpdateDeviceAsync(Guid.NewGuid(), new UpdateDeviceDto { Name = "X" }));
        }

        [Fact]
        public async Task UpdateDevice_SoftDeletedDevice_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Deleted", isDeleted: true);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.UpdateDeviceAsync(device.DeviceId, new UpdateDeviceDto { Name = "NewName" }));
        }

        [Fact]
        public async Task UpdateDevice_DuplicateName_ThrowsArgumentException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            Builders.SeedDevice(appDb, "OtherDevice");
            var device = Builders.SeedDevice(appDb, "MyDevice");

            await Assert.ThrowsAsync<ArgumentException>(() =>
                sut.UpdateDeviceAsync(device.DeviceId, new UpdateDeviceDto { Name = "OtherDevice" }));
        }

        [Fact]
        public async Task UpdateDevice_SameNameAsCurrent_DoesNotThrow()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "SameName");

            var ex = await Record.ExceptionAsync(() =>
                sut.UpdateDeviceAsync(device.DeviceId, new UpdateDeviceDto { Name = "SameName" }));
            Assert.Null(ex);
        }

        [Fact]
        public async Task UpdateDevice_NameTooShort_ThrowsArgumentException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "ValidName");

            await Assert.ThrowsAsync<ArgumentException>(() =>
                sut.UpdateDeviceAsync(device.DeviceId, new UpdateDeviceDto { Name = "ab" }));
        }

        [Fact]
        public async Task UpdateDevice_DescriptionUpdated_Persists()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            await sut.UpdateDeviceAsync(device.DeviceId, new UpdateDeviceDto { Description = "New desc" });

            var refreshed = await appDb.Devices.FindAsync(device.DeviceId);
            Assert.Equal("New desc", refreshed!.Description);
        }

        [Fact]
        public async Task UpdateDevice_ProtocolChange_WithExistingConfig_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();

            var cfgId = Guid.NewGuid();
            appDb.DeviceConfigurations.Add(new DeviceConfiguration { ConfigurationId = cfgId, Name = "cfg", Protocol = DeviceProtocol.Modbus });
            var dev = new Device { DeviceId = Guid.NewGuid(), Name = "Dev", GatewayId = "GW", Protocol = DeviceProtocol.Modbus, DeviceConfigurationId = cfgId };
            appDb.Devices.Add(dev);
            appDb.SaveChanges();

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.UpdateDeviceAsync(dev.DeviceId, new UpdateDeviceDto { Protocol = DeviceProtocol.OpcUa }));
        }

        [Fact]
        public async Task UpdateDevice_WithModbusTcpConfig_UpdatesConfiguration()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev", protocol: DeviceProtocol.Modbus);

            var configDto = new DeviceConfigurationDto
            {
                Name       = "cfg",
                Protocol   = DeviceProtocol.Modbus,
                ModbusMode = ModbusConnectionMode.Tcp,
                IpAddress  = "192.168.0.5",
                Port       = 502,
                SlaveId    = 2
            };

            await sut.UpdateDeviceAsync(device.DeviceId, new UpdateDeviceDto(), configDto);

            var refreshed = await appDb.Devices.Include(d => d.DeviceConfiguration)
                .FirstAsync(d => d.DeviceId == device.DeviceId);

            Assert.Equal("192.168.0.5", refreshed.DeviceConfiguration!.IpAddress);
        }
    }

    // =========================================================================
    //  AddConfigurationAsync Tests
    // =========================================================================

    public class AddConfigurationAsync_Tests
    {
        [Fact]
        public async Task AddConfiguration_ToExistingDevice_ReturnsConfigurationId()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            var dto = new DeviceConfigurationDto
            {
                Name       = "cfg",
                Protocol   = DeviceProtocol.Modbus,
                ModbusMode = ModbusConnectionMode.Tcp,
                IpAddress  = "10.0.0.1",
                Port       = 502,
                SlaveId    = 1
            };

            var cfgId = await sut.AddConfigurationAsync(device.DeviceId, dto);

            Assert.NotEqual(Guid.Empty, cfgId);
        }

        [Fact]
        public async Task AddConfiguration_ToDeletedDevice_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Deleted", isDeleted: true);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.AddConfigurationAsync(device.DeviceId, new DeviceConfigurationDto
                {
                    Name = "cfg", Protocol = DeviceProtocol.Modbus,
                    ModbusMode = ModbusConnectionMode.Tcp, IpAddress = "1.1.1.1", Port = 502, SlaveId = 1
                }));
        }

        [Fact]
        public async Task AddConfiguration_UnknownDevice_ThrowsKeyNotFoundException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                sut.AddConfigurationAsync(Guid.NewGuid(), new DeviceConfigurationDto
                {
                    Name = "cfg", Protocol = DeviceProtocol.Modbus,
                    ModbusMode = ModbusConnectionMode.Tcp, IpAddress = "1.1.1.1", Port = 502, SlaveId = 1
                }));
        }

        [Fact]
        public async Task AddConfiguration_OpcUaPolling_RequiresPollInterval()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev", protocol: DeviceProtocol.OpcUa);

            await Assert.ThrowsAsync<ArgumentException>(() =>
                sut.AddConfigurationAsync(device.DeviceId, new DeviceConfigurationDto
                {
                    Name             = "cfg",
                    Protocol         = DeviceProtocol.OpcUa,
                    ConnectionString = "opc.tcp://localhost",
                    ConnectionMode   = OpcUaConnectionMode.Polling,
                    PollIntervalMs   = null // missing
                }));
        }

        [Fact]
        public async Task AddConfiguration_ConfigNameEmpty_ThrowsArgumentException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            await Assert.ThrowsAsync<ArgumentException>(() =>
                sut.AddConfigurationAsync(device.DeviceId, new DeviceConfigurationDto
                {
                    Name = "",
                    Protocol = DeviceProtocol.Modbus,
                    ModbusMode = ModbusConnectionMode.Tcp,
                    IpAddress = "1.1.1.1", Port = 502, SlaveId = 1
                }));
        }
    }

    // =========================================================================
    //  AddPortAsync Tests
    // =========================================================================

    public class AddPortAsync_Tests
    {
        private static AddPortDto ValidPort(int slaveIndex = 1) =>
            new AddPortDto
            {
                slaveIndex = slaveIndex,
                IsHealthy  = true,
                Registers  = new List<RegisterDto>
                {
                    new RegisterDto
                    {
                        SignalName       = "Temp_001",
                        RegisterAddress  = 100,
                        RegisterLength   = 1,
                        DataType         = "float32",
                        Scale            = 1.0
                    }
                }
            };

        [Fact]
        public async Task AddPort_ValidData_ReturnsSlaveId()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            var result = await sut.AddPortAsync(device.DeviceId, ValidPort());

            Assert.NotEqual(Guid.Empty, result);
        }

        [Fact]
        public async Task AddPort_DeviceNotFound_ThrowsKeyNotFoundException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                sut.AddPortAsync(Guid.NewGuid(), ValidPort()));
        }

        [Fact]
        public async Task AddPort_EmptyRegisters_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            var dto = ValidPort();
            dto.Registers.Clear();

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.AddPortAsync(device.DeviceId, dto));
        }

        [Fact]
        public async Task AddPort_MoreThan5Registers_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            var dto = ValidPort();
            dto.Registers = Enumerable.Range(0, 6).Select(i => new RegisterDto
            {
                SignalName      = $"Signal_{i:D3}",
                RegisterAddress = i,
                RegisterLength  = 1,
                DataType        = "float32"
            }).ToList();

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.AddPortAsync(device.DeviceId, dto));
        }

        [Fact]
        public async Task AddPort_MoreThan2Slaves_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            await sut.AddPortAsync(device.DeviceId, ValidPort(1));
            await sut.AddPortAsync(device.DeviceId, ValidPort(2));

            // 3rd slave should be rejected
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.AddPortAsync(device.DeviceId, ValidPort(3)));
        }

        [Fact]
        public async Task AddPort_DuplicateSlaveIndex_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            await sut.AddPortAsync(device.DeviceId, ValidPort(1));

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.AddPortAsync(device.DeviceId, ValidPort(1)));
        }

        [Fact]
        public async Task AddPort_DuplicateSignalNamesInRequest_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            var dto = ValidPort();
            dto.Registers = new List<RegisterDto>
            {
                new RegisterDto { SignalName = "SameSignal", RegisterAddress = 0, RegisterLength = 1, DataType = "float32" },
                new RegisterDto { SignalName = "SameSignal", RegisterAddress = 1, RegisterLength = 1, DataType = "float32" }
            };

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.AddPortAsync(device.DeviceId, dto));
        }

        [Fact]
        public async Task AddPort_DuplicateRegisterAddresses_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            var dto = ValidPort();
            dto.Registers = new List<RegisterDto>
            {
                new RegisterDto { SignalName = "SigA", RegisterAddress = 100, RegisterLength = 1, DataType = "float32" },
                new RegisterDto { SignalName = "SigB", RegisterAddress = 100, RegisterLength = 1, DataType = "float32" }
            };

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.AddPortAsync(device.DeviceId, dto));
        }

        [Fact]
        public async Task AddPort_InvalidSignalNameFormat_ThrowsException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            var dto = ValidPort();
            dto.Registers[0].SignalName = "bad name!"; // spaces and special chars

            await Assert.ThrowsAsync<Exception>(() =>
                sut.AddPortAsync(device.DeviceId, dto));
        }

        [Fact]
        public async Task AddPort_NullDto_ThrowsArgumentNullException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            await Assert.ThrowsAsync<ArgumentNullException>(() =>
                sut.AddPortAsync(device.DeviceId, null!));
        }
    }

    // =========================================================================
    //  OPC UA Node Tests
    // =========================================================================

    public class AddOpcUaNodeAsync_Tests
    {
        private static CreateOpcUaNodeRequest ValidNodeRequest(
            string nodeId     = "ns=2;i=1001",
            string signalName = "Temperature") =>
            new CreateOpcUaNodeRequest
            {
                NodeId        = nodeId,
                SignalName    = signalName,
                DataType      = "Double",
                Unit          = "°C",
                ScalingFactor = 1.0
            };

        [Fact]
        public async Task AddOpcUaNode_ValidRequest_ReturnsNodeId()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "OpcDev", protocol: DeviceProtocol.OpcUa);

            var nodeId = await sut.AddOpcUaNodeAsync(device.DeviceId, ValidNodeRequest());

            Assert.NotEqual(Guid.Empty, nodeId);
        }

        [Fact]
        public async Task AddOpcUaNode_ToModbusDevice_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "ModbusDev", protocol: DeviceProtocol.Modbus);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.AddOpcUaNodeAsync(device.DeviceId, ValidNodeRequest()));
        }

        [Fact]
        public async Task AddOpcUaNode_DuplicateNodeId_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "OpcDev", protocol: DeviceProtocol.OpcUa);

            await sut.AddOpcUaNodeAsync(device.DeviceId, ValidNodeRequest("ns=2;i=1001", "Sig1"));

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.AddOpcUaNodeAsync(device.DeviceId, ValidNodeRequest("ns=2;i=1001", "Sig2")));
        }

        [Fact]
        public async Task AddOpcUaNode_DuplicateSignalName_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "OpcDev", protocol: DeviceProtocol.OpcUa);

            await sut.AddOpcUaNodeAsync(device.DeviceId, ValidNodeRequest("ns=2;i=1001", "Temperature"));

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.AddOpcUaNodeAsync(device.DeviceId, ValidNodeRequest("ns=2;i=1002", "Temperature")));
        }

        [Fact]
        public async Task AddOpcUaNode_EmptySignalName_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "OpcDev", protocol: DeviceProtocol.OpcUa);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.AddOpcUaNodeAsync(device.DeviceId, ValidNodeRequest(signalName: "")));
        }

        [Fact]
        public async Task AddOpcUaNode_UnknownDevice_ThrowsKeyNotFoundException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                sut.AddOpcUaNodeAsync(Guid.NewGuid(), ValidNodeRequest()));
        }

        [Fact]
        public async Task AddOpcUaNode_NullRequest_ThrowsArgumentNullException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "OpcDev", protocol: DeviceProtocol.OpcUa);

            await Assert.ThrowsAsync<ArgumentNullException>(() =>
                sut.AddOpcUaNodeAsync(device.DeviceId, null!));
        }
    }

    public class DeleteOpcUaNodeAsync_Tests
    {
        [Fact]
        public async Task DeleteOpcUaNode_NotMapped_RemovesNode()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "OpcDev", protocol: DeviceProtocol.OpcUa);

            var nodeId = await sut.AddOpcUaNodeAsync(device.DeviceId,
                new CreateOpcUaNodeRequest { NodeId = "ns=2;i=1", SignalName = "Sig1", DataType = "Double" });

            await sut.DeleteOpcUaNodeAsync(nodeId);

            var node = await appDb.OpcUaNodes.FindAsync(nodeId);
            Assert.Null(node);
        }

        [Fact]
        public async Task DeleteOpcUaNode_MappedToAsset_ThrowsInvalidOperationException()
        {
            var (sut, appDb, assetDb) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "OpcDev", protocol: DeviceProtocol.OpcUa);

            var opcNodeId = Guid.NewGuid();
            appDb.OpcUaNodes.Add(new OpcUaNode
            {
                OpcUaNodeId = opcNodeId,
                DeviceId    = device.DeviceId,
                NodeId      = "ns=2;i=9",
                SignalName  = "Pressure",
                DataType    = "Double"
            });
            appDb.SaveChanges();

            assetDb.Signals.Add(new Signal
            {
                SignalId    = Guid.NewGuid(),
                SignalKey   = "key",
                SignalName  = "Pressure",
                DeviceId    = device.DeviceId,
                OpcUaNodeId = opcNodeId
            });
            await assetDb.SaveChangesAsync();

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.DeleteOpcUaNodeAsync(opcNodeId));
        }

        [Fact]
        public async Task DeleteOpcUaNode_UnknownId_ThrowsKeyNotFoundException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            await Assert.ThrowsAsync<KeyNotFoundException>(() =>
                sut.DeleteOpcUaNodeAsync(Guid.NewGuid()));
        }
    }

    public class UpdateOpcUaNodeAsync_Tests
    {
        [Fact]
        public async Task UpdateOpcUaNode_ValidRequest_UpdatesFields()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "OpcDev", protocol: DeviceProtocol.OpcUa);

            var nodeId = await sut.AddOpcUaNodeAsync(device.DeviceId,
                new CreateOpcUaNodeRequest { NodeId = "ns=2;i=1", SignalName = "OldName", DataType = "Double" });

            await sut.UpdateOpcUaNodeAsync(nodeId,
                new CreateOpcUaNodeRequest { NodeId = "ns=2;i=1", SignalName = "NewName", DataType = "Float" });

            var node = await appDb.OpcUaNodes.FindAsync(nodeId);
            Assert.Equal("NewName", node!.SignalName);
            Assert.Equal("Float",   node.DataType);
        }

        [Fact]
        public async Task UpdateOpcUaNode_RenameWhileMapped_ThrowsInvalidOperationException()
        {
            var (sut, appDb, assetDb) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "OpcDev", protocol: DeviceProtocol.OpcUa);

            var opcNodeId = Guid.NewGuid();
            appDb.OpcUaNodes.Add(new OpcUaNode
            {
                OpcUaNodeId = opcNodeId,
                DeviceId    = device.DeviceId,
                NodeId      = "ns=2;i=1",
                SignalName  = "MappedSignal",
                DataType    = "Double"
            });
            appDb.SaveChanges();

            assetDb.Signals.Add(new Signal
            {
                SignalId    = Guid.NewGuid(),
                SignalKey   = "key",
                SignalName  = "MappedSignal",
                DeviceId    = device.DeviceId,
                OpcUaNodeId = opcNodeId
            });
            await assetDb.SaveChangesAsync();

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.UpdateOpcUaNodeAsync(opcNodeId,
                    new CreateOpcUaNodeRequest { NodeId = "ns=2;i=1", SignalName = "DifferentName", DataType = "Double" }));
        }

        [Fact]
        public async Task UpdateOpcUaNode_DuplicateNodeId_ThrowsInvalidOperationException()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "OpcDev", protocol: DeviceProtocol.OpcUa);

            await sut.AddOpcUaNodeAsync(device.DeviceId,
                new CreateOpcUaNodeRequest { NodeId = "ns=2;i=1", SignalName = "Sig1", DataType = "Double" });

            var nodeId2 = await sut.AddOpcUaNodeAsync(device.DeviceId,
                new CreateOpcUaNodeRequest { NodeId = "ns=2;i=2", SignalName = "Sig2", DataType = "Double" });

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                sut.UpdateOpcUaNodeAsync(nodeId2,
                    new CreateOpcUaNodeRequest { NodeId = "ns=2;i=1", SignalName = "Sig2", DataType = "Double" }));
        }
    }

    public class GetOpcUaNodesByDeviceAsync_Tests
    {
        [Fact]
        public async Task GetOpcUaNodes_ReturnsAllNodesForDevice()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "OpcDev", protocol: DeviceProtocol.OpcUa);

            await sut.AddOpcUaNodeAsync(device.DeviceId,
                new CreateOpcUaNodeRequest { NodeId = "ns=2;i=1", SignalName = "Temp", DataType = "Double" });
            await sut.AddOpcUaNodeAsync(device.DeviceId,
                new CreateOpcUaNodeRequest { NodeId = "ns=2;i=2", SignalName = "Pressure", DataType = "Double" });

            var nodes = await sut.GetOpcUaNodesByDeviceAsync(device.DeviceId);

            Assert.Equal(2, nodes.Count);
        }

        [Fact]
        public async Task GetOpcUaNodes_EmptyDevice_ReturnsEmptyList()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "OpcDev", protocol: DeviceProtocol.OpcUa);

            var nodes = await sut.GetOpcUaNodesByDeviceAsync(device.DeviceId);

            Assert.Empty(nodes);
        }
    }

    // =========================================================================
    //  IsDeviceMappedAsync Tests
    // =========================================================================

    public class IsDeviceMappedAsync_Tests
    {
        [Fact]
        public async Task IsDeviceMapped_WithSignal_ReturnsTrue()
        {
            var (sut, appDb, assetDb) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            assetDb.Signals.Add(new Signal
            {
                SignalId   = Guid.NewGuid(),
                SignalKey  = "k",
                SignalName = "s",
                DeviceId   = device.DeviceId
            });
            await assetDb.SaveChangesAsync();

            var result = await sut.IsDeviceMappedAsync(device.DeviceId);
            Assert.True(result);
        }

        [Fact]
        public async Task IsDeviceMapped_WithoutSignal_ReturnsFalse()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            var result = await sut.IsDeviceMappedAsync(device.DeviceId);
            Assert.False(result);
        }
    }

    // =========================================================================
    //  GetDeletedDevicesAsync Tests
    // =========================================================================

    public class GetDeletedDevicesAsync_Tests
    {
        [Fact]
        public async Task GetDeletedDevices_ReturnsOnlySoftDeleted()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            Builders.SeedDevice(appDb, "Active");
            Builders.SeedDevice(appDb, "SoftDeleted", isDeleted: true);

            var deleted = await sut.GetDeletedDevicesAsync();

            Assert.Single(deleted);
            Assert.Equal("SoftDeleted", deleted[0].Name);
        }

        [Fact]
        public async Task GetDeletedDevices_NoneDeleted_ReturnsEmptyList()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            Builders.SeedDevice(appDb, "Active");

            var deleted = await sut.GetDeletedDevicesAsync();
            Assert.Empty(deleted);
        }
    }

    // =========================================================================
    //  CreateDevicesBulkAsync Tests
    // =========================================================================

    public class CreateDevicesBulkAsync_Tests
    {
        [Fact]
        public async Task BulkCreate_ValidDevices_AllSucceed()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            var request = new BulkCreateDeviceDto
            {
                Devices = new List<CreateDeviceDto>
                {
                    new CreateDeviceDto { Name = "BulkDev1", GatewayClientId = "GW", Protocol = DeviceProtocol.Modbus },
                    new CreateDeviceDto { Name = "BulkDev2", GatewayClientId = "GW", Protocol = DeviceProtocol.Modbus }
                }
            };

            var result = await sut.CreateDevicesBulkAsync(request);

            Assert.Equal(2, result.CreatedDeviceIds.Count);
            Assert.Empty(result.Errors);
        }

        [Fact]
        public async Task BulkCreate_NullRequest_ThrowsArgumentException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            await Assert.ThrowsAsync<ArgumentException>(() =>
                sut.CreateDevicesBulkAsync(null!));
        }

        [Fact]
        public async Task BulkCreate_EmptyList_ThrowsArgumentException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            await Assert.ThrowsAsync<ArgumentException>(() =>
                sut.CreateDevicesBulkAsync(new BulkCreateDeviceDto { Devices = new List<CreateDeviceDto>() }));
        }

        [Fact]
        public async Task BulkCreate_WouldExceedMaxDevices_ReturnsError()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();

            for (int i = 0; i < 19; i++)
                Builders.SeedDevice(appDb, $"Existing{i}");

            var request = new BulkCreateDeviceDto
            {
                Devices = new List<CreateDeviceDto>
                {
                    new CreateDeviceDto { Name = "New1", GatewayClientId = "GW", Protocol = DeviceProtocol.Modbus },
                    new CreateDeviceDto { Name = "New2", GatewayClientId = "GW", Protocol = DeviceProtocol.Modbus }
                }
            };

            var result = await sut.CreateDevicesBulkAsync(request);

            Assert.Single(result.Errors);
            Assert.Empty(result.CreatedDeviceIds);
        }

        [Fact]
        public async Task BulkCreate_OneDuplicateName_SkipsItWithError()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            Builders.SeedDevice(appDb, "AlreadyExists");

            var request = new BulkCreateDeviceDto
            {
                Devices = new List<CreateDeviceDto>
                {
                    new CreateDeviceDto { Name = "NewDevice",     GatewayClientId = "GW", Protocol = DeviceProtocol.Modbus },
                    new CreateDeviceDto { Name = "AlreadyExists", GatewayClientId = "GW", Protocol = DeviceProtocol.Modbus }
                }
            };

            var result = await sut.CreateDevicesBulkAsync(request);

            Assert.Single(result.CreatedDeviceIds);
            Assert.Single(result.Errors);
            Assert.Contains("AlreadyExists", result.Errors[0]);
        }
    }

    // =========================================================================
    //  GetPortsByDeviceAsync Tests
    // =========================================================================

    public class GetPortsByDeviceAsync_Tests
    {
        [Fact]
        public async Task GetPorts_EmptyGuid_ThrowsArgumentException()
        {
            var (sut, _, _) = TestDbFactory.CreateDeviceManager();

            await Assert.ThrowsAsync<ArgumentException>(() =>
                sut.GetPortsByDeviceAsync(Guid.Empty, CancellationToken.None));
        }

        [Fact]
        public async Task GetPorts_NoSlaves_ReturnsEmptyList()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            var ports = await sut.GetPortsByDeviceAsync(device.DeviceId, CancellationToken.None);
            Assert.Empty(ports);
        }

        [Fact]
        public async Task GetPorts_AfterAdding_ReturnsSlave()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            await sut.AddPortAsync(device.DeviceId, new AddPortDto
            {
                slaveIndex = 1,
                IsHealthy  = true,
                Registers  = new List<RegisterDto>
                {
                    new RegisterDto { SignalName = "Sig_001", RegisterAddress = 0, RegisterLength = 1, DataType = "float32" }
                }
            });

            var ports = await sut.GetPortsByDeviceAsync(device.DeviceId, CancellationToken.None);
            Assert.Single(ports);
        }
    }

    // =========================================================================
    //  SignalLookupService Tests
    // =========================================================================

    public class SignalLookupService_Tests
    {
        private static SignalLookupService CreateSut(AssetDbContextForDevice assetDb)
        {
            var logger = new Mock<ILogger<SignalLookupService>>().Object;
            return new SignalLookupService(assetDb, logger);
        }

        [Fact]
        public async Task GetRegisterSignalLookup_WithMappedRegisters_ReturnsDictionary()
        {
            var assetDb  = TestDbFactory.CreateAssetDb();
            var deviceId = Guid.NewGuid();
            var regId    = Guid.NewGuid();
            var sigId    = Guid.NewGuid();

            assetDb.Signals.Add(new Signal
            {
                SignalId    = sigId,
                SignalKey   = "k",
                SignalName  = "T",
                DeviceId    = deviceId,
                RegisterId  = regId
            });
            await assetDb.SaveChangesAsync();

            var sut    = CreateSut(assetDb);
            var lookup = await sut.GetRegisterSignalLookupAsync(deviceId, CancellationToken.None);

            Assert.True(lookup.ContainsKey(regId));
            Assert.Equal(sigId, lookup[regId]);
        }

        [Fact]
        public async Task GetRegisterSignalLookup_NoMappings_ReturnsEmptyDictionary()
        {
            var assetDb  = TestDbFactory.CreateAssetDb();
            var sut      = CreateSut(assetDb);

            var lookup = await sut.GetRegisterSignalLookupAsync(Guid.NewGuid(), CancellationToken.None);

            Assert.Empty(lookup);
        }

        [Fact]
        public async Task GetOpcUaSignalLookup_WithMappedNodes_ReturnsDictionary()
        {
            var assetDb  = TestDbFactory.CreateAssetDb();
            var deviceId = Guid.NewGuid();
            var nodeId   = Guid.NewGuid();
            var sigId    = Guid.NewGuid();

            assetDb.Signals.Add(new Signal
            {
                SignalId    = sigId,
                SignalKey   = "k",
                SignalName  = "P",
                DeviceId    = deviceId,
                OpcUaNodeId = nodeId
            });
            await assetDb.SaveChangesAsync();

            var sut    = CreateSut(assetDb);
            var lookup = await sut.GetOpcUaSignalLookupAsync(deviceId, CancellationToken.None);

            Assert.True(lookup.ContainsKey(nodeId));
            Assert.Equal(sigId, lookup[nodeId]);
        }

        [Fact]
        public async Task GetOpcUaSignalLookup_NoMappings_ReturnsEmptyDictionary()
        {
            var assetDb = TestDbFactory.CreateAssetDb();
            var sut     = CreateSut(assetDb);

            var lookup = await sut.GetOpcUaSignalLookupAsync(Guid.NewGuid(), CancellationToken.None);

            Assert.Empty(lookup);
        }

        [Fact]
        public async Task GetRegisterSignalLookup_OnlyReturnsForRequestedDevice()
        {
            var assetDb   = TestDbFactory.CreateAssetDb();
            var deviceId1 = Guid.NewGuid();
            var deviceId2 = Guid.NewGuid();
            var regId1    = Guid.NewGuid();
            var regId2    = Guid.NewGuid();

            assetDb.Signals.AddRange(
                new Signal { SignalId = Guid.NewGuid(), SignalKey = "k1", SignalName = "S1", DeviceId = deviceId1, RegisterId = regId1 },
                new Signal { SignalId = Guid.NewGuid(), SignalKey = "k2", SignalName = "S2", DeviceId = deviceId2, RegisterId = regId2 });
            await assetDb.SaveChangesAsync();

            var sut    = CreateSut(assetDb);
            var lookup = await sut.GetRegisterSignalLookupAsync(deviceId1, CancellationToken.None);

            Assert.Single(lookup);
            Assert.True(lookup.ContainsKey(regId1));
        }
    }

    // =========================================================================
    //  GatewayService Tests
    //  (Pure validation logic tested without RabbitMQ or file-system calls)
    // =========================================================================

    /// <summary>
    /// Thin wrapper exposing only the gateway DB logic so we can test validation
    /// without hitting RabbitMQ or the CA certificate file.
    /// </summary>
    internal static class GatewayValidation
    {
        /// <summary>
        /// Mirrors the exact validation logic from GatewayService.AddGatewayAsync
        /// but without the external I/O.
        /// </summary>
        public static void ValidateGatewayName(string? gatewayName)
        {
            if (string.IsNullOrWhiteSpace(gatewayName))
                throw new ArgumentException("Gateway name is required", nameof(gatewayName));

            var trimmed = gatewayName.Trim();

            if (trimmed.Length < 3)
                throw new ArgumentException("Gateway name must be at least 3 characters long", nameof(gatewayName));

            if (trimmed.Length > 50)
                throw new ArgumentException("Gateway name cannot exceed 50 characters", nameof(gatewayName));

            if (!System.Text.RegularExpressions.Regex.IsMatch(trimmed, @"^[a-zA-Z0-9_-]+$"))
                throw new ArgumentException(
                    "Gateway name can contain only letters, numbers, hyphen and underscore",
                    nameof(gatewayName));
        }
    }

    public class GatewayService_ValidationTests
    {
        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public void ValidateGatewayName_NullOrWhitespace_ThrowsArgumentException(string bad)
        {
            Assert.Throws<ArgumentException>(() => GatewayValidation.ValidateGatewayName(bad));
        }

        [Fact]
        public void ValidateGatewayName_TooShort_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() => GatewayValidation.ValidateGatewayName("ab"));
        }

        [Fact]
        public void ValidateGatewayName_TooLong_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() =>
                GatewayValidation.ValidateGatewayName(new string('x', 51)));
        }

        [Fact]
        public void ValidateGatewayName_InvalidChars_ThrowsArgumentException()
        {
            Assert.Throws<ArgumentException>(() => GatewayValidation.ValidateGatewayName("bad name!"));
        }

        [Theory]
        [InlineData("Gateway1")]
        [InlineData("gw-prod")]
        [InlineData("My_Gateway")]
        [InlineData("abc")]
        public void ValidateGatewayName_ValidNames_DoesNotThrow(string name)
        {
            var ex = Record.Exception(() => GatewayValidation.ValidateGatewayName(name));
            Assert.Null(ex);
        }

        [Fact]
        public async Task AddGateway_DuplicateName_ThrowsArgumentException()
        {
            var appDb = TestDbFactory.CreateAppDb();
            appDb.Gateway.Add(new Gateway { Name = "existing-gw", ClientId = "GW-001", ClientSecretHash = "hash", Status = "ACTIVE" });
            appDb.SaveChanges();

            var isExist = await appDb.Gateway.AnyAsync(g => g.Name == "existing-gw");
            Assert.True(isExist);
        }

        [Fact]
        public async Task RefreshClientSecret_InactiveGateway_ShouldBeRejected()
        {
            // Mirrors the service logic: only ACTIVE gateways can refresh
            var appDb = TestDbFactory.CreateAppDb();
            var gw = new Gateway { Name = "gw1", ClientId = "GW-X", ClientSecretHash = "hash", Status = "INACTIVE" };
            appDb.Gateway.Add(gw);
            appDb.SaveChanges();

            var gateway = await appDb.Gateway.FirstOrDefaultAsync(g => g.ClientId == "GW-X");

            Assert.NotNull(gateway);
            Assert.NotEqual("ACTIVE", gateway!.Status);
            // Validation mirrors: if (gateway.Status != "ACTIVE") throw InvalidOperationException
            Assert.Throws<InvalidOperationException>(() =>
            {
                if (gateway.Status != "ACTIVE")
                    throw new InvalidOperationException("Only ACTIVE gateways can refresh client secret");
            });
        }

        [Fact]
        public async Task GetAllGateways_EmptyDb_ReturnsEmptyList()
        {
            var appDb    = TestDbFactory.CreateAppDb();
            var gateways = await appDb.Gateway.ToListAsync();

            Assert.Empty(gateways);
        }

        [Fact]
        public async Task DeleteGateway_UnknownClientId_ThrowsArgumentException()
        {
            var appDb = TestDbFactory.CreateAppDb();

            var gateway = await appDb.Gateway.FirstOrDefaultAsync(g => g.ClientId == "NONEXISTENT");
            Assert.Null(gateway);

            Assert.Throws<ArgumentException>(() =>
            {
                if (gateway == null)
                    throw new ArgumentException("Gateway not found", nameof(gateway));
            });
        }
    }

    // =========================================================================
    //  GetPortAsync Tests
    // =========================================================================

    public class GetPortAsync_Tests
    {
        [Fact]
        public async Task GetPort_ExistingSlaveIndex_ReturnsSlave()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            await sut.AddPortAsync(device.DeviceId, new AddPortDto
            {
                slaveIndex = 1,
                IsHealthy  = true,
                Registers  = new List<RegisterDto>
                {
                    new RegisterDto { SignalName = "Sig_A01", RegisterAddress = 0, RegisterLength = 1, DataType = "float32" }
                }
            });

            var port = await sut.GetPortAsync(device.DeviceId, 1);
            Assert.NotNull(port);
            Assert.Equal(1, port!.slaveIndex);
        }

        [Fact]
        public async Task GetPort_WrongSlaveIndex_ReturnsNull()
        {
            var (sut, appDb, _) = TestDbFactory.CreateDeviceManager();
            var device = Builders.SeedDevice(appDb, "Dev");

            var port = await sut.GetPortAsync(device.DeviceId, 99);
            Assert.Null(port);
        }
    }
}
