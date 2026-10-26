using System.ComponentModel.DataAnnotations;

namespace Application.DTOs
{
    public class UpdateAssetDto
    {
        public Guid AssetId { get; set; }

        public string NewName { get; set; } = string.Empty;
    }
}