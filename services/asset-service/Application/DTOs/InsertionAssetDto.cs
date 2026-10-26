using System.ComponentModel.DataAnnotations;

namespace Application.DTOs
{
    public class InsertionAssetDto
    {
        public Guid? ParentId { get; set; }

        [Required(ErrorMessage = "Name is required.")]
        [StringLength(100, MinimumLength = 3,
            ErrorMessage = "Name must be between 3 and 100 characters.")]
        [RegularExpression("^[A-Za-z0-9 _.-]+$",
            ErrorMessage = "Name contains invalid characters.")]
        public string Name { get; set; } = string.Empty;
    }
}