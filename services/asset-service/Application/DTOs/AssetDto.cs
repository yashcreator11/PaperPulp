namespace Application.DTOs
{
    public class AssetDto
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;

        public bool IsDeleted { get; set; }
    }
}