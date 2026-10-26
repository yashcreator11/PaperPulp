using Application.DTOs;
using Domain.Entities;
using FluentAssertions;
using Infrastructure.DBs;
using Infrastructure.Service;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using Xunit;

namespace TataPlantAsset.Application.Tests.Services
{
    public static class ContextFactory
    {
        public static DBContext Create()
        {
            var options = new DbContextOptionsBuilder<DBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w =>
                    w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new DBContext(options);
        }
    }

    public class AssetHierarchyServiceTests
    {
        private static AssetHierarchyService Build(DBContext ctx) =>
            new(new LoggerFactory().CreateLogger<AssetHierarchyService>(), ctx);

        // =========================================================
        // INSERT TESTS
        // =========================================================

        [Fact]
        public async Task InsertAssetAsync_Should_Insert_Root_Asset()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            var result = await svc.InsertAssetAsync(
                new InsertionAssetDto
                {
                    Name = "Plant"
                });

            result.Should().BeTrue();

            var asset = await ctx.Assets.FirstOrDefaultAsync();

            asset.Should().NotBeNull();
            asset!.Name.Should().Be("Plant");
            asset.Level.Should().Be(1);
        }

        [Fact]
        public async Task InsertAssetAsync_Should_Insert_Child_Asset()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            await svc.InsertAssetAsync(
                new InsertionAssetDto { Name = "Parent" });

            var parent = await ctx.Assets.FirstAsync();

            await svc.InsertAssetAsync(
                new InsertionAssetDto
                {
                    Name = "Child",
                    ParentId = parent.AssetId
                });

            var child = await ctx.Assets
                .FirstAsync(a => a.Name == "Child");

            child.Level.Should().Be(2);
            child.ParentId.Should().Be(parent.AssetId);
        }

        [Fact]
        public async Task InsertAssetAsync_Should_Throw_When_Parent_NotFound()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            Func<Task> act = async () =>
                await svc.InsertAssetAsync(
                    new InsertionAssetDto
                    {
                        Name = "Child",
                        ParentId = Guid.NewGuid()
                    });

            await act.Should()
                .ThrowAsync<Exception>()
                .WithMessage("Parent asset not found.*");
        }

        [Fact]
        public async Task InsertAssetAsync_Should_Throw_When_Level_Exceeds_5()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            Guid? parentId = null;

            for (int i = 1; i <= 5; i++)
            {
                await svc.InsertAssetAsync(
                    new InsertionAssetDto
                    {
                        Name = $"L{i}",
                        ParentId = parentId
                    });

                parentId = (await ctx.Assets
                    .FirstAsync(a => a.Name == $"L{i}")).AssetId;
            }

            Func<Task> act = async () =>
                await svc.InsertAssetAsync(
                    new InsertionAssetDto
                    {
                        Name = "L6",
                        ParentId = parentId
                    });

            await act.Should()
                .ThrowAsync<Exception>()
                .WithMessage("*Level 5*");
        }

        [Fact]
        public async Task InsertAssetAsync_Should_Throw_When_Name_Too_Short()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            Func<Task> act = async () =>
                await svc.InsertAssetAsync(
                    new InsertionAssetDto
                    {
                        Name = "A"
                    });

            await act.Should()
                .ThrowAsync<Exception>()
                .WithMessage("*too short*");
        }

        [Fact]
        public async Task InsertAssetAsync_Should_Throw_When_Name_Invalid()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            Func<Task> act = async () =>
                await svc.InsertAssetAsync(
                    new InsertionAssetDto
                    {
                        Name = "@@@"
                    });

            await act.Should()
                .ThrowAsync<Exception>()
                .WithMessage("*Invalid characters*");
        }

        [Fact]
        public async Task InsertAssetAsync_Should_Restore_SoftDeleted_Asset()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            await svc.InsertAssetAsync(
                new InsertionAssetDto { Name = "Pump" });

            var asset = await ctx.Assets.FirstAsync();

            await svc.DeleteAsset(asset.AssetId);

            var result = await svc.InsertAssetAsync(
                new InsertionAssetDto { Name = "Pump" });

            result.Should().BeTrue();

            var restored = await ctx.Assets.FirstAsync();

            restored.IsDeleted.Should().BeFalse();
        }

        // =========================================================
        // HIERARCHY TESTS
        // =========================================================

        [Fact]
        public async Task GetAssetHierarchy_Should_Return_Only_Roots()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            await svc.InsertAssetAsync(
                new InsertionAssetDto { Name = "Root" });

            var root = await ctx.Assets.FirstAsync();

            await svc.InsertAssetAsync(
                new InsertionAssetDto
                {
                    Name = "Child",
                    ParentId = root.AssetId
                });

            var result = await svc.GetAssetHierarchy();

            result.Should().HaveCount(1);
            result[0].Childrens.Should().HaveCount(1);
        }

        [Fact]
        public async Task GetByParentIdAsync_Should_Return_Children()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            await svc.InsertAssetAsync(
                new InsertionAssetDto { Name = "Parent" });

            var parent = await ctx.Assets.FirstAsync();

            await svc.InsertAssetAsync(
                new InsertionAssetDto
                {
                    Name = "Child1",
                    ParentId = parent.AssetId
                });

            await svc.InsertAssetAsync(
                new InsertionAssetDto
                {
                    Name = "Child2",
                    ParentId = parent.AssetId
                });

            var result = await svc.GetByParentIdAsync(parent.AssetId);

            result.Should().HaveCount(2);
        }

        // =========================================================
        // UPDATE TESTS
        // =========================================================

        [Fact]
        public async Task UpdateAssetName_Should_Update_Name()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            await svc.InsertAssetAsync(
                new InsertionAssetDto { Name = "Old" });

            var asset = await ctx.Assets.FirstAsync();

            var result = await svc.UpdateAssetName(
                new UpdateAssetDto
                {
                    AssetId = asset.AssetId,
                    NewName = "New"
                });

            result.Success.Should().BeTrue();

            var updated = await ctx.Assets.FindAsync(asset.AssetId);

            updated!.Name.Should().Be("New");
        }

        // =========================================================
        // DELETE TESTS
        // =========================================================

        [Fact]
        public async Task DeleteAsset_Should_SoftDelete_Asset()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            await svc.InsertAssetAsync(
                new InsertionAssetDto { Name = "Pump" });

            var asset = await ctx.Assets.FirstAsync();

            var result = await svc.DeleteAsset(asset.AssetId);

            result.Should().BeTrue();

            var deleted = await ctx.Assets.FindAsync(asset.AssetId);

            deleted!.IsDeleted.Should().BeTrue();
        }

        [Fact]
        public async Task DeleteAsset_Should_Throw_When_Child_Exists()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            await svc.InsertAssetAsync(
                new InsertionAssetDto { Name = "Parent" });

            var parent = await ctx.Assets.FirstAsync();

            await svc.InsertAssetAsync(
                new InsertionAssetDto
                {
                    Name = "Child",
                    ParentId = parent.AssetId
                });

            Func<Task> act = async () =>
                await svc.DeleteAsset(parent.AssetId);

            await act.Should()
                .ThrowAsync<Exception>()
                .WithMessage("*Delete child assets first*");
        }

        [Fact]
        public async Task DeleteAsset_Should_ReturnFalse_When_NotFound()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            var result = await svc.DeleteAsset(Guid.NewGuid());

            result.Should().BeFalse();
        }

        // =========================================================
        // RESTORE TESTS
        // =========================================================

        [Fact]
        public async Task RestoreAssetAsync_Should_Restore_Deleted_Asset()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            await svc.InsertAssetAsync(
                new InsertionAssetDto { Name = "Motor" });

            var asset = await ctx.Assets.FirstAsync();

            await svc.DeleteAsset(asset.AssetId);

            var result = await svc.RestoreAssetAsync(asset.AssetId);

            result.Should().BeTrue();

            var restored = await ctx.Assets.FindAsync(asset.AssetId);

            restored!.IsDeleted.Should().BeFalse();
        }

        // =========================================================
        // SEARCH TESTS
        // =========================================================

        [Fact]
        public async Task SearchAssetsAsync_Should_Filter_By_Name()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            await svc.InsertAssetAsync(
                new InsertionAssetDto { Name = "PumpA" });

            await svc.InsertAssetAsync(
                new InsertionAssetDto { Name = "MotorB" });

            var result = await svc.SearchAssetsAsync("Pump");

            result.Should().HaveCount(1);

            result[0].Name.Should().Be("PumpA");
        }

        [Fact]
        public async Task GetDeletedAssetsAsync_Should_Return_Deleted()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            await svc.InsertAssetAsync(
                new InsertionAssetDto { Name = "DeletedAsset" });

            var asset = await ctx.Assets.FirstAsync();

            await svc.DeleteAsset(asset.AssetId);

            var result = await svc.GetDeletedAssetsAsync();

            result.Should().HaveCount(1);
        }

        // =========================================================
        // UTILITY TESTS
        // =========================================================

        [Fact]
        public async Task GetAssetNameAsync_Should_Return_Name()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            await svc.InsertAssetAsync(
                new InsertionAssetDto { Name = "Boiler" });

            var asset = await ctx.Assets.FirstAsync();

            var result = await svc.GetAssetNameAsync(asset.AssetId);

            result.Should().Be("Boiler");
        }

        [Fact]
        public async Task GetAssetNameAsync_Should_Return_Null_When_NotFound()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            var result = await svc.GetAssetNameAsync(Guid.NewGuid());

            result.Should().BeNull();
        }

        // =========================================================
        // BULK INSERT TESTS
        // =========================================================

        [Fact]
        public async Task BulkInsertAssetsAsync_Should_Add_Assets()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            var request = new AssetUploadRequest
            {
                Assets = new List<AssetFileUploadDto>
                {
                    new()
                    {
                        AssetName = "Plant",
                        Level = 1
                    }
                }
            };

            var result = await svc.BulkInsertAssetsAsync(request);

            result.AddedAssets.Should().HaveCount(1);

            ctx.Assets.Count().Should().Be(1);
        }

        [Fact]
        public async Task BulkInsertAssetsAsync_Should_Skip_Duplicate()
        {
            var ctx = ContextFactory.Create();
            var svc = Build(ctx);

            await svc.InsertAssetAsync(
                new InsertionAssetDto { Name = "Plant" });

            var request = new AssetUploadRequest
            {
                Assets = new List<AssetFileUploadDto>
                {
                    new()
                    {
                        AssetName = "Plant",
                        Level = 1
                    }
                }
            };

            var result = await svc.BulkInsertAssetsAsync(request);

            result.SkippedAssets.Should().HaveCount(1);
        }
    }
}