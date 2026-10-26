using Domain.Entities;
using FluentAssertions;
using Infrastructure.DBs;
using Infrastructure.Service;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace TataPlantAsset.Application.Tests.Services
{
    /// <summary>
    /// Unit tests for AlertAnalysisRepository.
    /// </summary>
    public class AlertAnalysisRepositoryTests
    {
        private static DBContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<DBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            return new DBContext(options);
        }

        private static AlertAnalysis MakeAnalysis(Guid? assetId = null) => new()
        {
            AlertAnalysisId    = Guid.NewGuid(),
            AssetId            = assetId ?? Guid.NewGuid(),
            AssetName          = "TestAsset",
            FromUtc            = DateTime.UtcNow.AddHours(-2),
            ToUtc              = DateTime.UtcNow.AddHours(-1),
            RecommendedActions = "Check valve pressure",
            AnalyzedAtUtc      = DateTime.UtcNow
        };

        // ── CreateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task CreateAsync_Persists_Analysis_To_Database()
        {
            var ctx      = CreateContext();
            var repo     = new AlertAnalysisRepository(ctx);
            var analysis = MakeAnalysis();

            await repo.CreateAsync(analysis);

            var stored = await ctx.AlertAnalyses.FindAsync(analysis.AlertAnalysisId);
            stored.Should().NotBeNull();
            stored!.AlertAnalysisId.Should().Be(analysis.AlertAnalysisId);
        }

        [Fact]
        public async Task CreateAsync_Persists_Correct_AssetId()
        {
            var ctx      = CreateContext();
            var repo     = new AlertAnalysisRepository(ctx);
            var assetId  = Guid.NewGuid();
            var analysis = MakeAnalysis(assetId: assetId);

            await repo.CreateAsync(analysis);

            var stored = await ctx.AlertAnalyses.FirstAsync(a => a.AlertAnalysisId == analysis.AlertAnalysisId);
            stored.AssetId.Should().Be(assetId);
        }

        [Fact]
        public async Task CreateAsync_Persists_RecommendedActions()
        {
            var ctx      = CreateContext();
            var repo     = new AlertAnalysisRepository(ctx);
            var analysis = MakeAnalysis();
            analysis.RecommendedActions = "Replace filter immediately";

            await repo.CreateAsync(analysis);

            var stored = await ctx.AlertAnalyses.FindAsync(analysis.AlertAnalysisId);
            stored!.RecommendedActions.Should().Be("Replace filter immediately");
        }

        [Fact]
        public async Task CreateAsync_Can_Persist_Multiple_Analyses_For_Same_Asset()
        {
            var ctx     = CreateContext();
            var repo    = new AlertAnalysisRepository(ctx);
            var assetId = Guid.NewGuid();

            await repo.CreateAsync(MakeAnalysis(assetId: assetId));
            await repo.CreateAsync(MakeAnalysis(assetId: assetId));

            var count = await ctx.AlertAnalyses.CountAsync(a => a.AssetId == assetId);
            count.Should().Be(2);
        }

        [Fact]
        public async Task CreateAsync_Increments_Total_Count_In_Database()
        {
            var ctx  = CreateContext();
            var repo = new AlertAnalysisRepository(ctx);

            await repo.CreateAsync(MakeAnalysis());
            await repo.CreateAsync(MakeAnalysis());
            await repo.CreateAsync(MakeAnalysis());

            var total = await ctx.AlertAnalyses.CountAsync();
            total.Should().Be(3);
        }
    }
}
