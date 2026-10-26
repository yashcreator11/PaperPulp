using AuthMicroservice.Infrastructure.Persistance.DbContexts;
using AuthMicroservice.Domain.Entities;

namespace AuthMicroservice.Infrastructure.Persistance.seeding
{
    public class DefaultAsset
    {
        public static async Task SeedAsync(UserDbContext context)
        {
            await context.Database.EnsureCreatedAsync();

            if (!context.Users.Any(u => u.Role == "Admin"))
            {
                Console.WriteLine("No admin found. Creating default admin...");
                var admin = new User
                {
                    Username = "admin",
                    Email = "admin@example.com",
                    Role = "Admin",
                    PasswordHash = HashPassword("Admin@123")
                };
                context.Users.Add(admin);
                await context.SaveChangesAsync();
                Console.WriteLine("✅ Default admin created!");
            }
            else
            {
                Console.WriteLine("⚡ Admin already exists. Skipping seed.");
            }
        }

        private static string HashPassword(string password)
        {
            return BCrypt.Net.BCrypt.HashPassword(password);
        }
    }
}