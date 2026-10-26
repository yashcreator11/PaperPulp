using System.ComponentModel.DataAnnotations;

namespace AuthMicroservice.Application.Dtos
{
    public class UserDto
    {
        public int UserId { get; set; }

        [Required]
        [MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Role { get; set; } = "User";
    }
}