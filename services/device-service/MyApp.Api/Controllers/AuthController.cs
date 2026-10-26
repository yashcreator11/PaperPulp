using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MyApp.Infrastructure.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace MyApp.Api.Controllers
{
    [ApiController]
    [Route("api/connect")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IOptionsSnapshot<JwtOptions> _options;

        public AuthController(AppDbContext db, IOptionsSnapshot<JwtOptions> options)
        {
            _db = db;
            _options = options;
        }

        [HttpPost("token")]
        public async Task<IActionResult> Token([FromForm] string client_id, [FromForm] string client_secret)
        {
            var gateway = await _db.Gateway
                .FirstOrDefaultAsync(g => g.ClientId == client_id && g.Status == "ACTIVE");

            if (gateway == null) return Unauthorized("Invalid client");

            var hash = HashSecret(client_secret);
            if (hash != gateway.ClientSecretHash) return Unauthorized("Invalid secret");

            var claims = new[]
            {
                new Claim("client_id", gateway.ClientId),
                new Claim("type", "gateway"),
                new Claim("scope", "device.config.read")
            };

            var token = BuildToken(claims);

            return Ok(new
            {
                access_token = new JwtSecurityTokenHandler().WriteToken(token),
                token_type = "Bearer"
            });
        }

        private JwtSecurityToken BuildToken(Claim[] claims)
        {
            var cfg = _options.Value;
            return new JwtSecurityToken(
                issuer: cfg.Issuer,
                audience: cfg.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddYears(1),
                signingCredentials: new SigningCredentials(
                    new SymmetricSecurityKey(cfg.KeyBytes()),
                    SecurityAlgorithms.HmacSha256)
            );
        }

        private static string HashSecret(string secret)
        {
            using var sha = SHA256.Create();
            return Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(secret)));
        }
    }
}