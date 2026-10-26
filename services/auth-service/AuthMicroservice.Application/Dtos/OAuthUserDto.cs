namespace AuthMicroservice.Application.Dtos
{
    public class OAuthUserDto
    {
        public int OAuthUserId { get; set; }
        public required string Username { get; set; }
        public required string Email { get; set; }
        public required string Role { get; set; }
        public required string GoogleId { get; set; }
    }
}