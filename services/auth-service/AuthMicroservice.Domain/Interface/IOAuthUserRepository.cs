using AuthMicroservice.Domain.Entities;

namespace AuthMicroservice.Domain.Interface
{
    public interface IOAuthUserRepository
    {
        Task<OAuthUser?> GetByGoogleIdAsync(string googleId);
        Task<OAuthUser?> GetByEmailAsync(string email);
        Task<OAuthUser?> GetByRefreshTokenAsync(string refreshToken);
        Task AddAsync(OAuthUser oAuthUser);
        Task UpdateAsync(OAuthUser oAuthUser);
    }
}