using AuthMicroservice.Domain.Entities;

namespace AuthMicroservice.Domain.Interface
{
    public interface IUserOtpRepository
    {
        Task<UserOtp?> GetLatestOtp(string email);
        Task AddOtp(UserOtp otp);
        Task MarkUse(int id);  
        Task DeleteOldOtp(string email);
    }
}