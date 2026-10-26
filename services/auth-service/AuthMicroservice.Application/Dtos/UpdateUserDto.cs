namespace AuthMicroservice.Application.Dtos
{
    public class UpdateUserDto
    {
        public required string Username { get; set; }
        public required string Email { get; set; }
        public string? Password { get; set; }
        public string? Role { get; set; }
    }

    public class UpadateUserRole
    {
        public required string Username { get; set; }
        public required string Email { get; set; }
        public string? Role { get; set; }
    }
}