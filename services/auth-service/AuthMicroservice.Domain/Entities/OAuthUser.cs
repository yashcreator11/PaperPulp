using System;

namespace AuthMicroservice.Domain.Entities
{
    public class OAuthUser
    {
        public int OAuthUserId { get; set; }
        public required string Email { get; set; }
        public required string Username { get; set; }
        public required string Role { get; set; }
        public required string GoogleId { get; set; }
        public required string AccessToken { get; set; }
        public string? RefreshToken { get; set; }
    }
}