using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MyApp.Domain.Entities
{
    public class Gateway
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        
        [Required]
        [MaxLength(100)]
        public string ClientId { get; set; }= string.Empty;

        [Required]
        public string ClientSecretHash { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        public string Status { get; set; } = "ACTIVE";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
