using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthMicroservice.Domain.Entities
{
    public class User
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int UserId { get; set; }

        [Required]
        [MaxLength(50)]
        public required string Username { get; set; }

        [Required]
        [MaxLength(100)]
        [EmailAddress]
        public required string Email { get; set; }

        [Required]
        [MaxLength(255)]
        public required string PasswordHash { get; set; }

        [Required]
        [MaxLength(20)]
        public string Role { get; set; } = "User";

        [MaxLength(255)]
        public string? RefreshToken { get; set; }
        public DateTime? RefreshTokenExpiry { get; set; }
        public bool IsTourCompleted { get; set; } = false;
    }
}