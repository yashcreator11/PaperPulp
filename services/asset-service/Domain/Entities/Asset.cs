using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    public class Asset
    {
        [Key]
        public Guid AssetId { get; set; } = new Guid();

        [Required]
        [StringLength(50, MinimumLength = 3)]
        [RegularExpression("^[A-Za-z0-9 _.-]+$", ErrorMessage = "Name contains invalid characters.")]
        public required string Name { get; set; }
        public List<Asset> Childrens { get; set; } = new List<Asset>();
        public bool IsDeleted { get; set; } = false;
        
        public Guid? ParentId { get; set; }

        [Required]
        [Range(0,5 ,ErrorMessage ="Heirarchy cant Cross Level 5")]
        public int Level { get; set; }

        // public ICollection<AssetConfiguration> AssetConfigurations { get; set; } = new List<AssetConfiguration>();
    }
}
