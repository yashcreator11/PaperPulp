using Application.DTOs;
using Domain.Entities;
using Infrastructure.DBs;
using Infrastructure.Service;
using Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TataPlantAsset.Application.Tests.Fixtures;
using Xunit;
using static Application.DTOs.CreateMappingDto;

namespace TataPlantAsset.Application.Tests
{
    public class AssetMappingServiceTests : IClassFixture<DbContextFixture>
    {
        private readonly DbContextFixture _fixture;

        public AssetMappingServiceTests(DbContextFixture fixture)
        {
            _fixture = fixture;
        }

        [Fact]
        public async Task GetMappings_ShouldReturnSignals()
        {
            // Arrange
            var db = _fixture.CreateContext();

            db.Signals.Add(new Signal
            {
                SignalId = Guid.NewGuid(),
                SignalName = "Temperature",
                AssetId = Guid.NewGuid(),
                DeviceId = Guid.NewGuid()
            });

            await db.SaveChangesAsync();

            var service = new AssetMappingService(db);

            // Act
            var result = await service.GetMappings();

            // Assert
            Assert.Single(result);
        }

        [Fact]
        public async Task CreateMapping_ShouldCreateSignal_WhenValidRegisterProvided()
        {
            // Arrange
            var db = _fixture.CreateContext();

            var assetId = Guid.NewGuid();
            var deviceId = Guid.NewGuid();
            var registerId = Guid.NewGuid();

            // Add valid asset (IMPORTANT: Level >= 3)
            db.Assets.Add(new Asset
            {
                AssetId = assetId,
                Name = "TestAsset",
                Level = 3,
                IsDeleted = false
            });

            await db.SaveChangesAsync();

            var service = new AssetMappingService(db);

            var dto = new CreateMappingDto
            {
                AssetId = assetId,
                DeviceId = deviceId,
                Register = new RegisterMappingDto
                {
                    RegisterId = registerId,
                    SignalName = "Temperature",
                    Unit = "C",
                    MinThreshold = 10,
                    MaxThreshold = 100
                }
            };

            // Act
            var result = await service.CreateMapping(dto);

            // Assert
            Assert.NotNull(result);
            Assert.Equal("Temperature", result.SignalName);
            Assert.Equal(assetId, result.AssetId);
            Assert.Equal(deviceId, result.DeviceId);
            Assert.Equal(registerId, result.RegisterId);
            Assert.Null(result.OpcUaNodeId);

            // verify DB state
            var dbSignal = await db.Signals.FirstOrDefaultAsync();
            Assert.NotNull(dbSignal);
        }


        [Fact]
        public async Task CreateMapping_ShouldCreateSignal_WhenValidOpcUaNodeProvided()
        {
            var db = _fixture.CreateContext();

            var assetId = Guid.NewGuid();
            var deviceId = Guid.NewGuid();
            var nodeId = Guid.NewGuid();

            db.Assets.Add(new Asset
            {
                AssetId = assetId,
                Name = "TestAsset",
                Level = 3,
                IsDeleted = false
            });

            await db.SaveChangesAsync();

            var service = new AssetMappingService(db);

            var dto = new CreateMappingDto
            {
                AssetId = assetId,
                DeviceId = deviceId,
                OpcUaNode = new OpcUaMappingDto
                {
                    OpcUaNodeId = nodeId,
                    SignalName = "Pressure",
                    Unit = "Bar",
                    MinThreshold = 5,
                    MaxThreshold = 50
                }
            };

            var result = await service.CreateMapping(dto);

            Assert.NotNull(result);
            Assert.Equal("Pressure", result.SignalName);
            Assert.Equal(nodeId, result.OpcUaNodeId);
            Assert.Null(result.RegisterId);
        }


        [Fact]
        public async Task CreateMapping_ShouldThrow_WhenDtoIsNull()
        {
            // Arrange
            var db = _fixture.CreateContext();
            var service = new AssetMappingService(db);

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentNullException>(() =>
                service.CreateMapping(null));
        }

        [Fact]
        public async Task CreateMapping_ShouldThrow_WhenAssetIdIsEmpty()
        {
            // Arrange
            var db = _fixture.CreateContext();
            var service = new AssetMappingService(db);

            var dto = new CreateMappingDto
            {
                AssetId = Guid.Empty, // ❌ invalid
                DeviceId = Guid.NewGuid(),
                Register = new RegisterMappingDto
                {
                    RegisterId = Guid.NewGuid(),
                    SignalName = "Temp"
                }
            };

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.CreateMapping(dto));
        }

        [Fact]
        public async Task CreateMapping_ShouldThrow_WhenDeviceIdIsEmpty()
        {
            var db = _fixture.CreateContext();
            var service = new AssetMappingService(db);

            var dto = new CreateMappingDto
            {
                AssetId = Guid.NewGuid(),
                DeviceId = Guid.Empty,
                Register = new RegisterMappingDto
                {
                    RegisterId = Guid.NewGuid(),
                    SignalName = "Temp"
                }

            };

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.CreateMapping(dto));
        }

        [Fact]
        public async Task CreateMapping_ShouldThrow_WhenNeitherRegisterNorOpcUaProvided()
        {
            var db = _fixture.CreateContext();
            var service = new AssetMappingService(db);
            var dto = new CreateMappingDto
            {
                AssetId = Guid.NewGuid(),
                DeviceId = Guid.NewGuid(),
                Register = null,
                OpcUaNode = null
            };
            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.CreateMapping(dto));
        }

        [Fact]

        public async Task CreateMapping_ShouldThrow_WhenBothRegisterAndOpcUaProvided()
        {
            var db = _fixture.CreateContext();
            var service = new AssetMappingService(db);
            var dto = new CreateMappingDto
            {
                AssetId = Guid.NewGuid(),
                DeviceId = Guid.NewGuid(),
                Register = new RegisterMappingDto
                {
                    RegisterId = Guid.NewGuid(),
                    SignalName = "Temp"
                },
                OpcUaNode = new OpcUaMappingDto
                {
                    OpcUaNodeId = Guid.NewGuid(),
                    SignalName = "Temp"
                }
            };
            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.CreateMapping(dto));
        }

        [Fact]
        public async Task CreateMapping_ShouldThrow_WhenAssetNotFound()
        {
            // Arrange
            var db = _fixture.CreateContext();
            var service = new AssetMappingService(db);

            var dto = new CreateMappingDto
            {
                AssetId = Guid.NewGuid(), // not in DB
                DeviceId = Guid.NewGuid(),
                Register = new RegisterMappingDto
                {
                    RegisterId = Guid.NewGuid(),
                    SignalName = "Temp"
                }
            };

            // Act & Assert 
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.CreateMapping(dto));
        }

        [Fact]
        public async Task CreateMapping_ShouldThrow_WhenAssetLevelLessThan3()
        {
            var db = _fixture.CreateContext();
            var assetId = Guid.NewGuid();
            var deviceId = Guid.NewGuid();
            var registerId = Guid.NewGuid();

            db.Assets.Add(new Asset
            {
                AssetId = assetId,
                Name = "TestAsset",
                Level = 2, // ❌ level < 3
                IsDeleted = false
            });

            await db.SaveChangesAsync();

            var service = new AssetMappingService(db);

            var dto = new CreateMappingDto
            {
                AssetId = assetId,
                DeviceId = deviceId,
                Register = new RegisterMappingDto
                {
                    RegisterId = registerId,
                    SignalName = "Temperature",
                    Unit = "C",
                    MinThreshold = 10,
                    MaxThreshold = 100
                }
            };

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.CreateMapping(dto));

        }

        [Fact]
        public async Task CreateMapping_ShouldThrow_WhenRegisterAlreadyMapped()
        {
            var db = _fixture.CreateContext();
            var assetId = Guid.NewGuid();
            var deviceId = Guid.NewGuid();
            var registerId = Guid.NewGuid();

            db.Signals.Add(new Signal
            {
                SignalId = Guid.NewGuid(),
                SignalName = "ExistingSignal",
                AssetId = assetId,
                DeviceId = deviceId,
                RegisterId = registerId
            });
            db.Assets.Add(new Asset
            {
                AssetId = assetId,
                Name = "TestAsset",
                Level = 3,
                IsDeleted = false
            });

            await db.SaveChangesAsync();

            var service = new AssetMappingService(db);

            var dto = new CreateMappingDto
            {
                AssetId = assetId,
                DeviceId = deviceId,
                Register = new RegisterMappingDto
                {
                    RegisterId = registerId, // already mapped
                    SignalName = "NewSignal",
                    Unit = "C",
                    MinThreshold = 10,
                    MaxThreshold = 100
                }
            };

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateMapping(dto));
        }

        [Fact]

        public async Task CreateMapping_ShouldThrow_WhenOpcUaNodeAlreadyMapped()
        {
            var db = _fixture.CreateContext();
            var assetId = Guid.NewGuid();
            var deviceId = Guid.NewGuid();
            var nodeId = Guid.NewGuid();
            db.Signals.Add(new Signal
            {
                SignalId = Guid.NewGuid(),
                SignalName = "ExistingSignal",
                AssetId = assetId,
                DeviceId = deviceId,
                OpcUaNodeId = nodeId
            });
            db.Assets.Add(new Asset
            {
                AssetId = assetId,
                Name = "TestAsset",
                Level = 3,
                IsDeleted = false
            });
            await db.SaveChangesAsync();
            var service = new AssetMappingService(db);
            var dto = new CreateMappingDto
            {
                AssetId = assetId,
                DeviceId = deviceId,
                OpcUaNode = new OpcUaMappingDto
                {
                    OpcUaNodeId = nodeId, // already mapped
                    SignalName = "NewSignal",
                    Unit = "C",
                    MinThreshold = 10,
                    MaxThreshold = 100
                }
            };
            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateMapping(dto));
        }

        [Fact]
        public async Task CreateMapping_ShouldThrow_WhenSignalNameAlreadyExists_OnSameAssetAndDevice()
        {
            var db = _fixture.CreateContext();
            var assetId = Guid.NewGuid();
            var deviceId = Guid.NewGuid();
            db.Signals.Add(new Signal
            {
                SignalId = Guid.NewGuid(),
                SignalName = "ExistingSignal",
                AssetId = assetId,
                DeviceId = deviceId,
                RegisterId = Guid.NewGuid()
            });
            db.Assets.Add(new Asset
            {
                AssetId = assetId,
                Name = "TestAsset",
                Level = 3,
                IsDeleted = false
            });
            await db.SaveChangesAsync();
            var service = new AssetMappingService(db);
            var dto = new CreateMappingDto
            {
                AssetId = assetId,
                DeviceId = deviceId,
                Register = new RegisterMappingDto
                {
                    RegisterId = Guid.NewGuid(),
                    SignalName = "ExistingSignal", // same name on same asset/device
                    Unit = "C",
                    MinThreshold = 10,
                    MaxThreshold = 100
                }
            };
            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() => service.CreateMapping(dto));
        }


        [Fact]

        public async Task ClearMinMaxThreshouldsClearMinMaxThresholds_ShouldClearValues_WhenSignalExists()
        {
            // Arrange
            var db = _fixture.CreateContext();
            var signalId = Guid.NewGuid();
            db.Signals.Add(new Signal
            {
                SignalId = signalId,
                SignalName = "TestSignal",
                AssetId = Guid.NewGuid(),
                DeviceId = Guid.NewGuid(),
                RegisterId = Guid.NewGuid(),
                MinThreshold = 10,
                MaxThreshold = 100
            });
            await db.SaveChangesAsync();
            var service = new AssetMappingService(db);

            // Act
            var result = await service.ClearMinMaxThresholds(signalId);

            //assert
            Assert.NotNull(result);
            Assert.Null(result.MaxThreshold);
            Assert.Null(result.MinThreshold);
        }


        [Fact]
        public async Task ClearMinMaxThresholds_ShouldThrow_WhenSignalNotFound()
        {
            // Arrange
            var db = _fixture.CreateContext();
            var service = new AssetMappingService(db);

            var signalId = Guid.NewGuid(); // not in DB

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.ClearMinMaxThresholds(signalId));
        }

        [Fact]
        public async Task UpddateThresholds_ShouldUpdateValues_WhenValidInputs()
        {
            var db = _fixture.CreateContext();
            var signalId = Guid.NewGuid();

            db.Signals.Add(new Signal
            {
                SignalId = signalId,
                SignalName = "TestSignal",
                AssetId = Guid.NewGuid(),
                DeviceId = Guid.NewGuid(),
                MinThreshold = 10,
                MaxThreshold = 100
            });

            await db.SaveChangesAsync();
            var service = new AssetMappingService(db);

            //Act 
            var result = await service.UpdateThresholds(signalId, 20, 200);

            //Assert
            Assert.True(result);

            var updated = await db.Signals.FirstOrDefaultAsync(s => s.SignalId == signalId);
            Assert.Equal(20, updated.MinThreshold);
            Assert.Equal(200, updated.MaxThreshold);
        }

        [Fact]
        public async Task UpdateThresholds_ShouldThrow_WhenMinGreaterThanMax()
        {
            var db = _fixture.CreateContext();
            var service = new AssetMappingService(db);

            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                service.UpdateThresholds(Guid.NewGuid(), 100, 10)); // min > max
        }

        [Fact]

        public async Task UpdateThresholds_ShouldReturnFalse_WhenSignalNotFound()
        {
            var db = _fixture.CreateContext();
            var service = new AssetMappingService(db);

            var result = await service.UpdateThresholds(Guid.NewGuid(), 10, 100); // signalId not in DB

            Assert.False(result);
        }

        [Fact]
        public async Task UpdateThresholds_ShouldAllow_NullValues()
        {
            var db = _fixture.CreateContext();
            var service = new AssetMappingService(db);

            var signalId = Guid.NewGuid();

            db.Signals.Add(new Signal
            {
                SignalId = signalId,
                SignalName = "TestSignal",
                AssetId = Guid.NewGuid(),
                DeviceId = Guid.NewGuid(),
                MinThreshold = 10,
                MaxThreshold = 100
            });

            await db.SaveChangesAsync();

            // Act 
            var result = await service.UpdateThresholds(signalId, null, null);

            // Assert
            Assert.True(result);

            var updated = await db.Signals.FirstAsync(s => s.SignalId == signalId);
            Assert.Null(updated.MinThreshold);
            Assert.Null(updated.MaxThreshold);
        }

        [Fact]
        public async Task DeleteMappingAsync_ShouldDeleteSignal_WhenSignalExists()
        {
            // Arrange
            var db = _fixture.CreateContext();
            var signalId = Guid.NewGuid();

            db.Signals.Add(new Signal
            {
                SignalId = signalId,
                SignalName = "Temp",
                AssetId = Guid.NewGuid(),
                DeviceId = Guid.NewGuid()
            });

            await db.SaveChangesAsync();

            var service = new AssetMappingService(db);

            // Act
            var result = await service.DeleteMappingAsync(signalId);

            // Assert
            Assert.True(result);

            var deleted = await db.Signals.FirstOrDefaultAsync(s => s.SignalId == signalId);
            Assert.Null(deleted);
        }
    }

}