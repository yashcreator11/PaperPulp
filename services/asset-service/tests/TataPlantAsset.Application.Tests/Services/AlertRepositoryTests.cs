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
    /// <summary>
    /// Unit tests for AlertRepository.
    /// Each test gets a fresh in-memory database so there is no state bleed.
    /// </summary>
    public class AlertRepositoryTests
    {
        // ── helpers ──────────────────────────────────────────────────────────

        private static DBContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<DBContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;
            return new DBContext(options);
        }

        private static AlertRepository BuildRepo(DBContext ctx) =>
            new(ctx, new LoggerFactory().CreateLogger<AlertRepository>());

        private static Alert MakeAlert(
            Guid? signalId = null,
            Guid? mappingId = null,
            bool isActive = true,
            bool isAnalyzed = false,
            DateTime? startUtc = null,
            DateTime? endUtc = null)
        {
            var start = startUtc ?? DateTime.UtcNow.AddHours(-1);
            return new Alert
            {
                AlertId          = Guid.NewGuid(),
                AssetId          = Guid.NewGuid(),
                AssetName        = "TestAsset",
                SignalId         = signalId ?? Guid.NewGuid(),
                MappingId        = mappingId,
                SignalName       = "Temperature",
                AlertStartUtc    = start,
                AlertEndUtc      = endUtc,
                MinThreshold     = 10,
                MaxThreshold     = 100,
                MinObservedValue = 10,
                MaxObservedValue = 100,
                IsActive         = isActive,
                IsAnalyzed       = isAnalyzed,
                CreatedUtc       = start,
                UpdatedUtc       = start
            };
        }

        // ── CreateAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task CreateAsync_Persists_Alert_To_Database()
        {
            var ctx  = CreateContext();
            var repo = BuildRepo(ctx);
            var alert = MakeAlert();

            await repo.CreateAsync(alert);

            var stored = await ctx.Alerts.FindAsync(alert.AlertId);
            stored.Should().NotBeNull();
            stored!.AlertId.Should().Be(alert.AlertId);
        }

        // ── GetByIdAsync ─────────────────────────────────────────────────────

        [Fact]
        public async Task GetByIdAsync_Returns_Alert_When_Found()
        {
            var ctx   = CreateContext();
            var repo  = BuildRepo(ctx);
            var alert = MakeAlert();
            await repo.CreateAsync(alert);

            var result = await repo.GetByIdAsync(alert.AlertId);

            result.Should().NotBeNull();
            result!.AlertId.Should().Be(alert.AlertId);
        }

        [Fact]
        public async Task GetByIdAsync_Returns_Null_When_Not_Found()
        {
            var ctx  = CreateContext();
            var repo = BuildRepo(ctx);

            var result = await repo.GetByIdAsync(Guid.NewGuid());

            result.Should().BeNull();
        }

        // ── GetActiveBySignalAsync ────────────────────────────────────────────

        [Fact]
        public async Task GetActiveBySignalAsync_Returns_MostRecent_Active_Alert()
        {
            var ctx      = CreateContext();
            var repo     = BuildRepo(ctx);
            var signalId = Guid.NewGuid();

            var older = MakeAlert(signalId: signalId, startUtc: DateTime.UtcNow.AddHours(-3));
            var newer = MakeAlert(signalId: signalId, startUtc: DateTime.UtcNow.AddHours(-1));
            await repo.CreateAsync(older);
            await repo.CreateAsync(newer);

            var result = await repo.GetActiveBySignalAsync(signalId);

            result.Should().NotBeNull();
            result!.AlertId.Should().Be(newer.AlertId);
        }

        [Fact]
        public async Task GetActiveBySignalAsync_Returns_Null_When_No_Active_Alert()
        {
            var ctx      = CreateContext();
            var repo     = BuildRepo(ctx);
            var signalId = Guid.NewGuid();

            var inactive = MakeAlert(signalId: signalId, isActive: false);
            await repo.CreateAsync(inactive);

            var result = await repo.GetActiveBySignalAsync(signalId);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetActiveBySignalAsync_Returns_Null_When_Signal_Unknown()
        {
            var ctx  = CreateContext();
            var repo = BuildRepo(ctx);

            var result = await repo.GetActiveBySignalAsync(Guid.NewGuid());

            result.Should().BeNull();
        }

        // ── GetActiveAsync (legacy MappingId) ─────────────────────────────────

        [Fact]
        public async Task GetActiveAsync_Returns_Active_Alert_For_MappingId()
        {
            var ctx       = CreateContext();
            var repo      = BuildRepo(ctx);
            var mappingId = Guid.NewGuid();

            var alert = MakeAlert(mappingId: mappingId, isActive: true);
            await repo.CreateAsync(alert);

            var result = await repo.GetActiveAsync(mappingId);

            result.Should().NotBeNull();
            result!.MappingId.Should().Be(mappingId);
        }

        [Fact]
        public async Task GetActiveAsync_Returns_Null_When_Alert_Inactive()
        {
            var ctx       = CreateContext();
            var repo      = BuildRepo(ctx);
            var mappingId = Guid.NewGuid();

            await repo.CreateAsync(MakeAlert(mappingId: mappingId, isActive: false));

            var result = await repo.GetActiveAsync(mappingId);

            result.Should().BeNull();
        }

        // ── UpdateStatsAsync ──────────────────────────────────────────────────

        [Fact]
        public async Task UpdateStatsAsync_Updates_Min_And_Max_Observed_Values()
        {
            var ctx   = CreateContext();
            var repo  = BuildRepo(ctx);
            var alert = MakeAlert();
            alert.MinObservedValue = 50;
            alert.MaxObservedValue = 50;
            await repo.CreateAsync(alert);

            await repo.UpdateStatsAsync(alert.AlertId, 20);  // new min
            await repo.UpdateStatsAsync(alert.AlertId, 80);  // new max

            var updated = await ctx.Alerts.FindAsync(alert.AlertId);
            updated!.MinObservedValue.Should().Be(20);
            updated.MaxObservedValue.Should().Be(80);
        }

        [Fact]
        public async Task UpdateStatsAsync_Does_Nothing_When_Alert_Not_Found()
        {
            var ctx  = CreateContext();
            var repo = BuildRepo(ctx);

            // Should not throw — just a no-op
            var act = async () => await repo.UpdateStatsAsync(Guid.NewGuid(), 42);
            await act.Should().NotThrowAsync();
        }

        [Fact]
        public async Task UpdateStatsAsync_Does_Not_Lower_Max_When_Value_Is_Smaller()
        {
            var ctx   = CreateContext();
            var repo  = BuildRepo(ctx);
            var alert = MakeAlert();
            alert.MaxObservedValue = 100;
            await repo.CreateAsync(alert);

            await repo.UpdateStatsAsync(alert.AlertId, 50); // value < current max

            var updated = await ctx.Alerts.FindAsync(alert.AlertId);
            updated!.MaxObservedValue.Should().Be(100);
        }

        // ── ResolveAsync ──────────────────────────────────────────────────────

        [Fact]
        public async Task ResolveAsync_Sets_IsActive_False_And_EndTime()
        {
            var ctx        = CreateContext();
            var repo       = BuildRepo(ctx);
            var alert      = MakeAlert(isActive: true);
            await repo.CreateAsync(alert);
            var resolvedAt = DateTime.UtcNow;

            await repo.ResolveAsync(alert.AlertId, resolvedAt);

            var resolved = await ctx.Alerts.FindAsync(alert.AlertId);
            resolved!.IsActive.Should().BeFalse();
            resolved.AlertEndUtc.Should().NotBeNull();
        }

        [Fact]
        public async Task ResolveAsync_Does_Nothing_When_Alert_Not_Found()
        {
            var ctx  = CreateContext();
            var repo = BuildRepo(ctx);

            var act = async () => await repo.ResolveAsync(Guid.NewGuid(), DateTime.UtcNow);
            await act.Should().NotThrowAsync();
        }

        // ── MarkResolvedAsync ─────────────────────────────────────────────────

        [Fact]
        public async Task MarkResolvedAsync_Deactivates_Alert()
        {
            var ctx   = CreateContext();
            var repo  = BuildRepo(ctx);
            var alert = MakeAlert(isActive: true);
            await repo.CreateAsync(alert);

            await repo.MarkResolvedAsync(alert.AlertId, DateTime.UtcNow);

            var result = await ctx.Alerts.FindAsync(alert.AlertId);
            result!.IsActive.Should().BeFalse();
            result.AlertEndUtc.Should().NotBeNull();
        }

        [Fact]
        public async Task MarkResolvedAsync_Is_NoOp_When_Alert_Missing()
        {
            var ctx  = CreateContext();
            var repo = BuildRepo(ctx);

            var act = async () => await repo.MarkResolvedAsync(Guid.NewGuid(), DateTime.UtcNow);
            await act.Should().NotThrowAsync();
        }

        // ── MarkAnalyzedAsync ─────────────────────────────────────────────────

        [Fact]
        public async Task MarkAnalyzedAsync_Sets_IsAnalyzed_True_For_All_Ids()
        {
            var ctx    = CreateContext();
            var repo   = BuildRepo(ctx);
            var alert1 = MakeAlert(isAnalyzed: false);
            var alert2 = MakeAlert(isAnalyzed: false);
            await repo.CreateAsync(alert1);
            await repo.CreateAsync(alert2);

            await repo.MarkAnalyzedAsync(new[] { alert1.AlertId, alert2.AlertId });

            var a1 = await ctx.Alerts.FindAsync(alert1.AlertId);
            var a2 = await ctx.Alerts.FindAsync(alert2.AlertId);
            a1!.IsAnalyzed.Should().BeTrue();
            a2!.IsAnalyzed.Should().BeTrue();
        }

        [Fact]
        public async Task MarkAnalyzedAsync_Only_Updates_Specified_Ids()
        {
            var ctx         = CreateContext();
            var repo        = BuildRepo(ctx);
            var toMark      = MakeAlert(isAnalyzed: false);
            var untouched   = MakeAlert(isAnalyzed: false);
            await repo.CreateAsync(toMark);
            await repo.CreateAsync(untouched);

            await repo.MarkAnalyzedAsync(new[] { toMark.AlertId });

            var u = await ctx.Alerts.FindAsync(untouched.AlertId);
            u!.IsAnalyzed.Should().BeFalse();
        }

        // ── GetUnAnalyzedByAssetAsync (date-range overload) ───────────────────

        [Fact]
        public async Task GetUnAnalyzedByAssetAsync_Returns_Closed_Unanalyzed_Alerts_In_Range()
        {
            var ctx     = CreateContext();
            var repo    = BuildRepo(ctx);
            var assetId = Guid.NewGuid();
            var now     = DateTime.UtcNow;

            var match = MakeAlert(
                isActive: false, isAnalyzed: false,
                startUtc: now.AddHours(-2), endUtc: now.AddHours(-1));
            match.AssetId = assetId;

            var outOfRange = MakeAlert(
                isActive: false, isAnalyzed: false,
                startUtc: now.AddDays(-5), endUtc: now.AddDays(-4));
            outOfRange.AssetId = assetId;

            await repo.CreateAsync(match);
            await repo.CreateAsync(outOfRange);

            var results = await repo.GetUnAnalyzedByAssetAsync(assetId, now.AddHours(-3), now);

            results.Should().HaveCount(1);
            results[0].AlertId.Should().Be(match.AlertId);
        }

        [Fact]
        public async Task GetUnAnalyzedByAssetAsync_Excludes_Active_Alerts()
        {
            var ctx     = CreateContext();
            var repo    = BuildRepo(ctx);
            var assetId = Guid.NewGuid();
            var now     = DateTime.UtcNow;

            var activeAlert = MakeAlert(
                isActive: true, isAnalyzed: false,
                startUtc: now.AddHours(-2), endUtc: now.AddHours(-1));
            activeAlert.AssetId = assetId;
            await repo.CreateAsync(activeAlert);

            var results = await repo.GetUnAnalyzedByAssetAsync(assetId, now.AddHours(-3), now);

            results.Should().BeEmpty();
        }

        // ── GetUnAnalyzedByAssetIDAsync (no date range) ───────────────────────

        [Fact]
        public async Task GetUnAnalyzedByAssetIDAsync_Returns_All_Closed_Unanalyzed_Alerts()
        {
            var ctx     = CreateContext();
            var repo    = BuildRepo(ctx);
            var assetId = Guid.NewGuid();

            var a1 = MakeAlert(isActive: false, isAnalyzed: false);
            a1.AssetId = assetId;
            var a2 = MakeAlert(isActive: false, isAnalyzed: false);
            a2.AssetId = assetId;
            var analyzed = MakeAlert(isActive: false, isAnalyzed: true);
            analyzed.AssetId = assetId;

            await repo.CreateAsync(a1);
            await repo.CreateAsync(a2);
            await repo.CreateAsync(analyzed);

            var results = await repo.GetUnAnalyzedByAssetIDAsync(assetId);

            results.Should().HaveCount(2);
            results.All(r => !r.IsAnalyzed).Should().BeTrue();
        }

        // ── GetAllAsync ───────────────────────────────────────────────────────

        [Fact]
        public async Task GetAllAsync_Returns_Alerts_For_AssetId()
        {
            var ctx     = CreateContext();
            var repo    = BuildRepo(ctx);
            var assetId = Guid.NewGuid();

            var match  = MakeAlert(); match.AssetId  = assetId;
            var other  = MakeAlert(); // different assetId

            await repo.CreateAsync(match);
            await repo.CreateAsync(other);

            var results = await repo.GetAllAsync(null, null, assetId);

            results.Should().HaveCount(1);
            results[0].AssetId.Should().Be(assetId);
        }

        [Fact]
        public async Task GetAllAsync_Filters_By_FromUtc()
        {
            var ctx     = CreateContext();
            var repo    = BuildRepo(ctx);
            var assetId = Guid.NewGuid();
            var now     = DateTime.UtcNow;

            var recent = MakeAlert(startUtc: now.AddHours(-1)); recent.AssetId = assetId;
            var old    = MakeAlert(startUtc: now.AddDays(-10)); old.AssetId    = assetId;

            await repo.CreateAsync(recent);
            await repo.CreateAsync(old);

            var results = await repo.GetAllAsync(now.AddHours(-2), null, assetId);

            results.Should().HaveCount(1);
            results[0].AlertId.Should().Be(recent.AlertId);
        }

        [Fact]
        public async Task GetAllAsync_Filters_By_ToUtc()
        {
            var ctx     = CreateContext();
            var repo    = BuildRepo(ctx);
            var assetId = Guid.NewGuid();
            var now     = DateTime.UtcNow;

            var recent = MakeAlert(startUtc: now.AddHours(-1)); recent.AssetId = assetId;
            var old    = MakeAlert(startUtc: now.AddDays(-5));  old.AssetId    = assetId;

            await repo.CreateAsync(recent);
            await repo.CreateAsync(old);

            var results = await repo.GetAllAsync(null, now.AddDays(-2), assetId);

            results.Should().HaveCount(1);
            results[0].AlertId.Should().Be(old.AlertId);
        }

        [Fact]
        public async Task GetAllAsync_Returns_All_Assets_When_AssetId_Is_Empty()
        {
            var ctx  = CreateContext();
            var repo = BuildRepo(ctx);

            await repo.CreateAsync(MakeAlert());
            await repo.CreateAsync(MakeAlert());

            var results = await repo.GetAllAsync(null, null, Guid.Empty);

            results.Should().HaveCount(2);
        }
    }
}
