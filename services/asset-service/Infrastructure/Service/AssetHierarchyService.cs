using Application.DTOs;
using Application.Interface;
using Domain.Entities;
using Infrastructure.DBs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.RegularExpressions;


namespace Infrastructure.Service
{
    public class AssetHierarchyService : IAssetHierarchyService
    {
        private readonly ILogger<AssetHierarchyService> _logger;
        private readonly DBContext _context;

        public AssetHierarchyService(
            ILogger<AssetHierarchyService> logger,
            DBContext context)
        {
            _logger = logger;
            _context = context;
        }

        #region Hierarchy

        public async Task<List<Asset>> GetAssetHierarchy()
        {
            try
            {
                var allAssets = await _context.Assets
                    .AsNoTracking()
                    .Where(a => !a.IsDeleted)
                    .ToListAsync();

                var map = allAssets.ToDictionary(a => a.AssetId);

                foreach (var asset in allAssets)
                {
                    if (asset.ParentId.HasValue &&
                        map.ContainsKey(asset.ParentId.Value))
                    {
                        map[asset.ParentId.Value].Childrens.Add(asset);
                    }
                }

                return allAssets
                    .Where(a => a.ParentId == null || a.ParentId == Guid.Empty)
                    .ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting asset hierarchy");
                return new List<Asset>();
            }
        }

        public async Task<List<AssetDto>> GetByParentIdAsync(Guid? parentId)
        {
            try
            {
                return await _context.Assets
                    .AsNoTracking()
                    .Where(a => a.ParentId == parentId && !a.IsDeleted)
                    .Select(a => new AssetDto
                    {
                        Id = a.AssetId,
                        Name = a.Name,
                        IsDeleted = a.IsDeleted
                    })
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching children for {ParentId}", parentId);
                return new List<AssetDto>();
            }
        }

        #endregion

        #region Insert

        public async Task<bool> InsertAssetAsync(InsertionAssetDto dto)
        {
            try
            {
                int level = 1;

                if (dto.ParentId.HasValue)
                {
                    var parent = await _context.Assets
                        .AsNoTracking()
                        .FirstOrDefaultAsync(a =>
                            a.AssetId == dto.ParentId && !a.IsDeleted);

                    if (parent == null)
                        throw new Exception("Parent asset not found.");

                    level = parent.Level + 1;

                    if (level > 5)
                        throw new Exception("Asset cannot be added beyond Level 5.");
                }
                if (dto.Name.Length < 2)
                    throw new Exception("Asset name too short");

                if (!Regex.IsMatch(dto.Name, "^[a-zA-Z0-9 ]+$"))
                    throw new Exception("Invalid characters");
                var existing = await _context.Assets
                    .FirstOrDefaultAsync(a => a.Name == dto.Name);

                if (existing != null)
                {
                    if (existing.IsDeleted)
                    {
                        existing.IsDeleted = false;
                        existing.ParentId = dto.ParentId;
                        existing.Level = level;

                        _context.Assets.Update(existing);
                        await _context.SaveChangesAsync();
                        return true;
                    }

                    throw new Exception("Asset name already exists.");
                }

                var newAsset = new Asset
                {
                    AssetId = Guid.NewGuid(),
                    Name = dto.Name,
                    ParentId = dto.ParentId,
                    Level = level,
                    IsDeleted = false
                };

                await _context.Assets.AddAsync(newAsset);
                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error inserting asset");
                throw;
            }
        }

        #endregion

        #region Update

        public async Task<(bool Success, string Message)> UpdateAssetName(UpdateAssetDto dto)
        {
            try
            {
                var asset = await _context.Assets
                    .FirstOrDefaultAsync(a => a.AssetId == dto.AssetId);

                if (asset == null)
                    return (false, "Asset not found.");

                var existing = await _context.Assets
                    .FirstOrDefaultAsync(a =>
                        a.Name == dto.NewName &&
                        a.AssetId != dto.AssetId);

                if (existing != null)
                {
                    if (existing.IsDeleted)
                    {
                        existing.IsDeleted = false;
                        existing.ParentId = asset.ParentId;
                        existing.Level = asset.Level;

                        _context.Assets.Update(existing);
                        await _context.SaveChangesAsync();

                        return (true, "Soft deleted asset restored.");
                    }

                    return (false, "Asset name already exists.");
                }

                asset.Name = dto.NewName;
                await _context.SaveChangesAsync();

                return (true, "Asset renamed successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating asset");
                return (false, "Unexpected error occurred.");
            }
        }

        #endregion

        #region Delete / Restore

        public async Task<bool> DeleteAsset(Guid assetId)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                bool connected = await _context.Signals
                    .AnyAsync(a => a.AssetId == assetId);

                if (connected)
                    throw new Exception("Unassign device before deleting.");

                var asset = await _context.Assets
                    .Include(a => a.Childrens.Where(c => !c.IsDeleted))
                    .FirstOrDefaultAsync(a => a.AssetId == assetId);

                if (asset == null)
                    return false;

                if (asset.Childrens.Any())
                    throw new Exception("Delete child assets first.");

                // Clean up orphaned signals for this asset
                var orphanedSignals = await _context.Signals
                    .Where(s => s.AssetId == assetId)
                    .ToListAsync();

                if (orphanedSignals.Any())
                    _context.Signals.RemoveRange(orphanedSignals);

                asset.IsDeleted = true;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return true;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Error deleting asset");
                throw;
            }
        }

        public async Task<bool> RestoreAssetAsync(Guid assetId)
        {
            var asset = await _context.Assets
                .FirstOrDefaultAsync(a => a.AssetId == assetId);

            if (asset == null)
                throw new KeyNotFoundException("Asset not found.");

            if (!asset.IsDeleted)
                throw new InvalidOperationException("Asset is not deleted.");

            asset.IsDeleted = false;
            await _context.SaveChangesAsync();

            return true;
        }

        #endregion

        #region Search

        public async Task<List<AssetDto>> SearchAssetsAsync(string? searchTerm)
        {
            try
            {
                var query = _context.Assets
                    .AsNoTracking()
                    .Where(a => !a.IsDeleted);

                if (!string.IsNullOrWhiteSpace(searchTerm))
                {
                    query = query.Where(a =>
                        EF.Functions.Like(a.Name, $"%{searchTerm}%"));
                }

                return await query
                    .Select(a => new AssetDto
                    {
                        Id = a.AssetId,
                        Name = a.Name,
                        IsDeleted = a.IsDeleted
                    })
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching assets");
                return new List<AssetDto>();
            }
        }

        public async Task<List<AssetDto>> GetDeletedAssetsAsync()
        {
            return await _context.Assets
                .AsNoTracking()
                .Where(a => a.IsDeleted)
                .Select(a => new AssetDto
                {
                    Id = a.AssetId,
                    Name = a.Name,
                    IsDeleted = true
                })
                .ToListAsync();
        }

        #endregion

        #region Utility

        public async Task<string?> GetAssetNameAsync(Guid assetId)
        {
            try
            {
                return await _context.Assets
                    .AsNoTracking()
                    .Where(a => a.AssetId == assetId && !a.IsDeleted)
                    .Select(a => a.Name)
                    .FirstOrDefaultAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving asset name");
                return null;
            }
        }

        public async Task<SignalDto?> GetSignalByIdAsync(Guid signalId)
        {
            return await _context.Signals
                .AsNoTracking()
                .Where(s => s.SignalId == signalId)
                .Select(s => new SignalDto
                {
                    SignalId = s.SignalId,
                    SignalKey = s.SignalKey,
                    AssetId = s.AssetId,
                    DeviceId = s.DeviceId,
                    SignalName = s.SignalName,
                    Unit = s.Unit,
                    // SignalTypeId = s.SignalTypeId
                    MinThreshold = s.MinThreshold,
                    MaxThreshold = s.MaxThreshold
                })
                .FirstOrDefaultAsync();
        }



        #endregion

        #region Bulk Upload

        public async Task<AssetUploadResponse> BulkInsertAssetsAsync(AssetUploadRequest assets)
        {
            try
            {
                var response = new AssetUploadResponse
                {
                    AddedAssets = new List<string>(),
                    SkippedAssets = new List<string>()
                };

                var existingAssets = await _context.Assets
                    .Where(a => !a.IsDeleted)
                    .ToDictionaryAsync(a => a.Name, a => a.AssetId);

                var sortedAssets = assets.Assets.OrderBy(a => a.Level);

                foreach (var asset in sortedAssets)
                {
                    if (existingAssets.ContainsKey(asset.AssetName))
                    {
                        response.SkippedAssets.Add(
                            $"Asset '{asset.AssetName}' already exists.");
                        continue;
                    }

                    Guid? parentId = null;

                    if (!string.IsNullOrWhiteSpace(asset.ParentName))
                    {
                        if (!existingAssets.TryGetValue(
                            asset.ParentName, out var parent))
                        {
                            response.SkippedAssets.Add(
                                $"Parent '{asset.ParentName}' not found.");
                            continue;
                        }

                        parentId = parent;
                    }

                    var newAsset = new Asset
                    {
                        AssetId = Guid.NewGuid(),
                        Name = asset.AssetName,
                        ParentId = parentId,
                        Level = asset.Level,
                        IsDeleted = false
                    };

                    await _context.Assets.AddAsync(newAsset);
                    existingAssets[newAsset.Name] = newAsset.AssetId;

                    response.AddedAssets.Add(
                        $"Asset '{asset.AssetName}' added.");
                }

                await _context.SaveChangesAsync();
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Bulk upload failed");
                throw;
            }
        }

        #endregion
    }
}
