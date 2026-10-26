using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.DBs
{
    public class UserAuthDbContext : DbContext
    {
        // ✅ Use generic DbContextOptions<UserAuthDbContext>
        public UserAuthDbContext(DbContextOptions<UserAuthDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; } = null!;
    }
}
