using Application.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace TataPlantAsset.Application.Tests.TestData
{
    public static class AssetTestData
    {
        public static InsertionAssetDto RootAsset => new InsertionAssetDto
        {
            Name = "Root Asset",
            ParentId = null
        };

        public static InsertionAssetDto ChildAsset(Guid parentId) => new InsertionAssetDto
        {
            Name = "Child Asset",
            ParentId = parentId
        };

        public static UpdateAssetDto RenameAsset(Guid assetId, string oldName, string newName) => new UpdateAssetDto
        {
            AssetId = assetId,
            NewName = newName
        };

    }
}
