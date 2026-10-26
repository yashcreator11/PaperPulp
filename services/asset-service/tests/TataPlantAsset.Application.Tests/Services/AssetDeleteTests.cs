using Application.DTOs;
using FluentAssertions;
using Infrastructure.Service;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Threading.Tasks;
using TataPlantAsset.Application.Tests.Fixtures;
using Xunit;

namespace TataPlantAsset.Application.Tests.Services
{
    public class AssetDeleteTests
    {
        private readonly DbContextFixture _fixture;

        public AssetDeleteTests()
        {
            _fixture = new DbContextFixture();
        }

        [Fact]
        public async Task DeleteAsset_Should_Set_IsDeleted()
        {
            // Arrange
            var context = _fixture.CreateContext();
            var logger = new LoggerFactory().CreateLogger<AssetHierarchyService>();
            var service = new AssetHierarchyService(logger, context);

            var dto = new InsertionAssetDto { Name = "DeleteMe" };
            await service.InsertAssetAsync(dto);
            var asset = await context.Assets.FirstAsync(a => a.Name == "DeleteMe");

            // Act
            var result = await service.DeleteAsset(asset.AssetId);

            // Assert
            result.Should().BeTrue();
            var deletedAsset = await context.Assets.FindAsync(asset.AssetId);
            deletedAsset.Should().NotBeNull();
            deletedAsset!.IsDeleted.Should().BeTrue();
        }
    }
}
