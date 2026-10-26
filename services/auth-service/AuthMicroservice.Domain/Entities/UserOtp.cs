using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AuthMicroservice.Domain.Entities
{
    public class UserOtp
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int OtpId { get; set; }

        [Required]
        [MaxLength(100)]
        [EmailAddress]
        public required string Email { get; set; }

        [Required]
        public int Otp { get; set; }

        public DateTime ExpiryAt { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsUsed { get; set; } = false;
    }
}