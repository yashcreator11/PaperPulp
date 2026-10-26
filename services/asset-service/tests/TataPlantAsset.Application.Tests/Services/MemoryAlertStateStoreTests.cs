using FluentAssertions;
using Infrastructure.Service;
using Xunit;

namespace TataPlantAsset.Application.Tests.Services
{
    /// <summary>
    /// Unit tests for MemoryAlertStateStore (signalAleart.cs).
    /// Pure in-memory — no database or mocks needed.
    /// </summary>
    public class MemoryAlertStateStoreTests
    {
        private static MemoryAlertStateStore Build() => new();

        // ── GetAsync ──────────────────────────────────────────────────────────

        [Fact]
        public async Task GetAsync_Returns_Null_When_Key_Does_Not_Exist()
        {
            var store = Build();

            var result = await store.GetAsync(Guid.NewGuid());

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetAsync_Returns_State_After_SetActive()
        {
            var store     = Build();
            var mappingId = Guid.NewGuid();
            var startUtc  = DateTime.UtcNow;

            await store.SetActiveAsync(mappingId, startUtc, 42.0);

            var result = await store.GetAsync(mappingId);

            result.Should().NotBeNull();
            result!.MappingId.Should().Be(mappingId);
        }

        // ── SetActiveAsync ────────────────────────────────────────────────────

        [Fact]
        public async Task SetActiveAsync_Creates_Active_State_With_Correct_Values()
        {
            var store        = Build();
            var mappingId    = Guid.NewGuid();
            var startUtc     = DateTime.UtcNow;
            double initValue = 55.5;

            await store.SetActiveAsync(mappingId, startUtc, initValue);

            var state = await store.GetAsync(mappingId);
            state.Should().NotBeNull();
            state!.IsActive.Should().BeTrue();
            state.MappingId.Should().Be(mappingId);
            state.StartUtc.Should().Be(startUtc);
            state.MinValue.Should().Be(initValue);
            state.MaxValue.Should().Be(initValue);
            state.LastUpdatedUtc.Should().Be(startUtc);
        }

        [Fact]
        public async Task SetActiveAsync_Overwrites_Previous_State_For_Same_MappingId()
        {
            var store     = Build();
            var mappingId = Guid.NewGuid();

            await store.SetActiveAsync(mappingId, DateTime.UtcNow.AddHours(-1), 10.0);
            var firstStart = DateTime.UtcNow;
            await store.SetActiveAsync(mappingId, firstStart, 99.0);

            var state = await store.GetAsync(mappingId);
            state!.MinValue.Should().Be(99.0);
            state.MaxValue.Should().Be(99.0);
        }

        [Fact]
        public async Task SetActiveAsync_Stores_Independent_States_For_Different_MappingIds()
        {
            var store = Build();
            var id1   = Guid.NewGuid();
            var id2   = Guid.NewGuid();

            await store.SetActiveAsync(id1, DateTime.UtcNow, 10.0);
            await store.SetActiveAsync(id2, DateTime.UtcNow, 20.0);

            var s1 = await store.GetAsync(id1);
            var s2 = await store.GetAsync(id2);
            s1!.MinValue.Should().Be(10.0);
            s2!.MinValue.Should().Be(20.0);
        }

        // ── UpdateActiveAsync ─────────────────────────────────────────────────

        [Fact]
        public async Task UpdateActiveAsync_Raises_MaxValue_When_Value_Is_Higher()
        {
            var store     = Build();
            var mappingId = Guid.NewGuid();

            await store.SetActiveAsync(mappingId, DateTime.UtcNow, 50.0);
            await store.UpdateActiveAsync(mappingId, 80.0, DateTime.UtcNow);

            var state = await store.GetAsync(mappingId);
            state!.MaxValue.Should().Be(80.0);
        }

        [Fact]
        public async Task UpdateActiveAsync_Lowers_MinValue_When_Value_Is_Smaller()
        {
            var store     = Build();
            var mappingId = Guid.NewGuid();

            await store.SetActiveAsync(mappingId, DateTime.UtcNow, 50.0);
            await store.UpdateActiveAsync(mappingId, 20.0, DateTime.UtcNow);

            var state = await store.GetAsync(mappingId);
            state!.MinValue.Should().Be(20.0);
        }

        [Fact]
        public async Task UpdateActiveAsync_Does_Not_Lower_Max_When_Value_Is_Smaller()
        {
            var store     = Build();
            var mappingId = Guid.NewGuid();

            await store.SetActiveAsync(mappingId, DateTime.UtcNow, 50.0);
            await store.UpdateActiveAsync(mappingId, 30.0, DateTime.UtcNow);

            var state = await store.GetAsync(mappingId);
            state!.MaxValue.Should().Be(50.0);
        }

        [Fact]
        public async Task UpdateActiveAsync_Does_Not_Raise_Min_When_Value_Is_Larger()
        {
            var store     = Build();
            var mappingId = Guid.NewGuid();

            await store.SetActiveAsync(mappingId, DateTime.UtcNow, 50.0);
            await store.UpdateActiveAsync(mappingId, 70.0, DateTime.UtcNow);

            var state = await store.GetAsync(mappingId);
            state!.MinValue.Should().Be(50.0);
        }

        [Fact]
        public async Task UpdateActiveAsync_Updates_LastUpdatedUtc()
        {
            var store     = Build();
            var mappingId = Guid.NewGuid();
            var start     = DateTime.UtcNow.AddMinutes(-5);
            var update    = DateTime.UtcNow;

            await store.SetActiveAsync(mappingId, start, 50.0);
            await store.UpdateActiveAsync(mappingId, 60.0, update);

            var state = await store.GetAsync(mappingId);
            state!.LastUpdatedUtc.Should().Be(update);
        }

        [Fact]
        public async Task UpdateActiveAsync_Is_NoOp_When_MappingId_Not_Found()
        {
            var store = Build();

            // Should not throw
            var act = async () =>
                await store.UpdateActiveAsync(Guid.NewGuid(), 42.0, DateTime.UtcNow);

            await act.Should().NotThrowAsync();
        }

        [Fact]
        public async Task UpdateActiveAsync_Is_NoOp_After_State_Cleared()
        {
            var store     = Build();
            var mappingId = Guid.NewGuid();

            await store.SetActiveAsync(mappingId, DateTime.UtcNow, 50.0);
            await store.ClearActiveAsync(mappingId, DateTime.UtcNow);
            // Update on cleared state should not throw and state stays absent
            await store.UpdateActiveAsync(mappingId, 99.0, DateTime.UtcNow);

            var state = await store.GetAsync(mappingId);
            state.Should().BeNull();
        }

        // ── ClearActiveAsync ──────────────────────────────────────────────────

        [Fact]
        public async Task ClearActiveAsync_Returns_State_And_Removes_From_Store()
        {
            var store     = Build();
            var mappingId = Guid.NewGuid();

            await store.SetActiveAsync(mappingId, DateTime.UtcNow, 50.0);
            var cleared = await store.ClearActiveAsync(mappingId, DateTime.UtcNow);

            cleared.Should().NotBeNull();
            cleared!.IsActive.Should().BeFalse();

            var afterClear = await store.GetAsync(mappingId);
            afterClear.Should().BeNull();
        }

        [Fact]
        public async Task ClearActiveAsync_Returns_Null_When_Key_Not_Found()
        {
            var store  = Build();
            var result = await store.ClearActiveAsync(Guid.NewGuid(), DateTime.UtcNow);

            result.Should().BeNull();
        }

        [Fact]
        public async Task ClearActiveAsync_Returns_Null_On_Double_Clear()
        {
            var store     = Build();
            var mappingId = Guid.NewGuid();

            await store.SetActiveAsync(mappingId, DateTime.UtcNow, 50.0);
            await store.ClearActiveAsync(mappingId, DateTime.UtcNow);

            // second clear should return null, not throw
            var second = await store.ClearActiveAsync(mappingId, DateTime.UtcNow);
            second.Should().BeNull();
        }

        [Fact]
        public async Task ClearActiveAsync_Does_Not_Affect_Other_MappingIds()
        {
            var store = Build();
            var id1   = Guid.NewGuid();
            var id2   = Guid.NewGuid();

            await store.SetActiveAsync(id1, DateTime.UtcNow, 10.0);
            await store.SetActiveAsync(id2, DateTime.UtcNow, 20.0);

            await store.ClearActiveAsync(id1, DateTime.UtcNow);

            var remaining = await store.GetAsync(id2);
            remaining.Should().NotBeNull();
            remaining!.MinValue.Should().Be(20.0);
        }

        // ── concurrency ───────────────────────────────────────────────────────

        [Fact]
        public async Task UpdateActiveAsync_Is_ThreadSafe_Under_Concurrent_Updates()
        {
            var store     = Build();
            var mappingId = Guid.NewGuid();

            await store.SetActiveAsync(mappingId, DateTime.UtcNow, 50.0);

            // Fire 20 concurrent updates — should not throw or deadlock
            var tasks = Enumerable
                .Range(1, 20)
                .Select(i => store.UpdateActiveAsync(mappingId, i * 5.0, DateTime.UtcNow));

            var act = async () => await Task.WhenAll(tasks);
            await act.Should().NotThrowAsync();

            var state = await store.GetAsync(mappingId);
            state.Should().NotBeNull();
            state!.MaxValue.Should().Be(100.0); // 20 * 5
        }

        [Fact]
        public async Task SetActiveAsync_Is_ThreadSafe_For_Same_MappingId()
        {
            var store     = Build();
            var mappingId = Guid.NewGuid();

            var tasks = Enumerable
                .Range(0, 10)
                .Select(_ => store.SetActiveAsync(mappingId, DateTime.UtcNow, 1.0));

            var act = async () => await Task.WhenAll(tasks);
            await act.Should().NotThrowAsync();
        }
    }
}
