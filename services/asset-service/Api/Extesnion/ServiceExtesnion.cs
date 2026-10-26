using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using Microsoft.Extensions.Options;

namespace Api.Extesnion
{
    public static class ServiceExtesnion
    {
        public static IServiceCollection AddCustomAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

            services.AddAuthentication(options =>
            {
                options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                var jwtOptions = services.BuildServiceProvider()
                    .GetRequiredService<IOptions<JwtOptions>>().Value;

                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidAudience = jwtOptions.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(jwtOptions.KeyBytes()),
                    RoleClaimType = ClaimTypes.Role,
                    ClockSkew = TimeSpan.Zero
                };
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var token = context.Request.Cookies["access_token"];
                        if (!string.IsNullOrEmpty(token))
                            context.Token = token;
                        return Task.CompletedTask;
                    },
                    OnAuthenticationFailed = context =>
                    {
                        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
                        logger.LogError(context.Exception, "JWT Authentication failed");
                        return Task.CompletedTask;
                    }
                };
            });

            services.AddAuthorization(options =>
            {
                options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
                options.AddPolicy("ManagerOrAdmin", policy => policy.RequireRole("Manager", "Admin"));
            });

            return services;
        }
    }
}