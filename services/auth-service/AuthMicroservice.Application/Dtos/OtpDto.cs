namespace AuthMicroservice.Application.Dtos
{
    public class OtpDto
    {
        public required string Email { get; set; }
        public int Otp { get; set; }
    }
}