using AuthMicroservice.Domain.Entities;

namespace AuthMicroservice.Domain.Interface
{
    public interface IUserRepository
    {
        Task<List<User>> GetAllAsync();
        Task<User?> GetByIdAsync(int id);
        Task<User?> GetByEmailAsync(string email);
        Task<User?> GetByRefreshTokenAsync(string refreshToken);
        Task AddAsync(User user);
        Task UpdateAsync(User user);
        Task DeleteAsync(int id);
        Task<bool> UsernameExistsAsync(string username, int? excludeId = null);
        Task<bool> EmailExistsAsync(string email, int? excludeId = null);
        Task SaveChangesAsync();
    }
}