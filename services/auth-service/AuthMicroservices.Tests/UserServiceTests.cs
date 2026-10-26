using AuthMicroservice.Application.Dtos;
using AuthMicroservice.Application.Interface;
using AuthMicroservice.Application.Mapping;
using AuthMicroservice.Application.UseCases;
using AuthMicroservice.Domain.Entities;
using AuthMicroservice.Domain.Interface;
using AutoMapper;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using System.Security.Claims;
using Xunit;
using AuthMicroservice.Application;
namespace AuthMicroservice.Tests.UseCases;

/// <summary>
/// Unit tests for <see cref="UserService"/>.
/// Dependencies (repositories, mapper, config, email) are all mocked with Moq.
/// </summary>
public class UserServiceTests
{
    // ──────────────────────────────────────────────
    //  Shared test infrastructure
    // ──────────────────────────────────────────────

    private readonly Mock<IUserRepository> _userRepo = new();
    private readonly Mock<IOAuthUserRepository> _oAuthRepo = new();
    private readonly Mock<IUserOtpRepository> _otpRepo = new();
    private readonly Mock<IEamilService> _emailService = new();
    private readonly IMapper _mapper;
    private readonly IConfiguration _config;

    private readonly UserService _sut;   // System Under Test

    public UserServiceTests()
    {
        // FIX: AutoMapper 15 removed the single-Action constructor.
        // Use MapperConfigurationExpression + Mapper directly.
        
        // FALLBACK — works in all AutoMapper 15.x builds
        var mapConfigExpr = new MapperConfigurationExpression();
        mapConfigExpr.AddProfile<MappingProfile>();
        mapConfigExpr.LicenseKey = "YOUR_LICENSE_KEY"; // required in v15
        _mapper = new Mapper(new MapperConfiguration(mapConfigExpr, new NullLoggerFactory()));

        // Minimal in-memory configuration with valid JWT settings
        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "ThisIsASecretKeyForTestingPurposesOnly!", // NOSONAR - test-only dummy secret
                ["Jwt:EncryptionKey"] = "0123456789ABCDEF0123456789ABCDEF", // NOSONAR - test-only dummy secret
                ["Jwt:Issuer"] = "test-issuer",
                ["Jwt:Audience"] = "test-audience"
            })
            .Build();

        var jwtOptions = Options.Create(new JwtOptions
        {
            Key = "ThisIsASecretKeyForTestingPurposesOnly!", // NOSONAR - test-only dummy secret
            EncryptionKey = "0123456789ABCDEF0123456789ABCDEF", // NOSONAR - test-only dummy secret
            Issuer = "test-issuer",
            Audience = "test-audience"
        });

        _sut = new UserService(
            _userRepo.Object,
            _oAuthRepo.Object,
            _mapper,
            _config,
            _otpRepo.Object,
            _emailService.Object,
            jwtOptions);
    }

    // ──────────────────────────────────────────────
    //  Helper builders
    // ──────────────────────────────────────────────

    private static User MakeUser(int id = 1, string role = "User") => new()
    {
        UserId = id,
        Username = $"user{id}",
        Email = $"user{id}@example.com",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password1!"),
        Role = role
    };

    private static UserOtp MakeOtp(string email, int otp, bool isUsed = false, int minutesUntilExpiry = 5) => new()
    {
        OtpId = 1,
        Email = email,
        Otp = otp,
        IsUsed = isUsed,
        ExpiryAt = DateTime.UtcNow.AddMinutes(minutesUntilExpiry)
    };

    // ══════════════════════════════════════════════
    //  GetAllAsync
    // ══════════════════════════════════════════════

    [Fact]
    public async Task GetAllAsync_ReturnsMappedUserDtos()
    {
        var users = new List<User> { MakeUser(1), MakeUser(2) };
        _userRepo.Setup(r => r.GetAllAsync()).ReturnsAsync(users);

        var result = await _sut.GetAllAsync();

        Assert.Equal(2, result.Count);
        Assert.Equal("user1", result[0].Username);
        Assert.Equal("user2", result[1].Username);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsEmptyList_WhenNoUsers()
    {
        _userRepo.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<User>());

        var result = await _sut.GetAllAsync();

        Assert.Empty(result);
    }

    // ══════════════════════════════════════════════
    //  GetByIdAsync
    // ══════════════════════════════════════════════

    [Fact]
    public async Task GetByIdAsync_ReturnsUser_WhenExists()
    {
        var user = MakeUser(42);
        _userRepo.Setup(r => r.GetByIdAsync(42)).ReturnsAsync(user);

        var result = await _sut.GetByIdAsync(42);

        Assert.Equal(42, result.UserId);
        Assert.Equal("user42", result.Username);
    }

    [Fact]
    public async Task GetByIdAsync_Throws_WhenUserNotFound()
    {
        _userRepo.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((User?)null);

        var ex = await Assert.ThrowsAsync<Exception>(() => _sut.GetByIdAsync(99));
        Assert.Contains("99", ex.Message);
    }

    // ══════════════════════════════════════════════
    //  CreateAsync
    // ══════════════════════════════════════════════

    [Fact]
    public async Task CreateAsync_ReturnsNewUser_WhenDataIsValid()
    {
        var dto = new CreateUserDto { Username = "alice", Email = "alice@test.com", Password = "Secret1!" };
        _userRepo.Setup(r => r.UsernameExistsAsync("alice", null)).ReturnsAsync(false);
        _userRepo.Setup(r => r.EmailExistsAsync("alice@test.com", null)).ReturnsAsync(false);
        _userRepo.Setup(r => r.AddAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

        var result = await _sut.CreateAsync(dto);

        Assert.Equal("alice", result.Username);
        Assert.Equal("alice@test.com", result.Email);
        Assert.Equal("User", result.Role);  // default role
        _userRepo.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Once);
    }

    [Theory]
    [InlineData("", "a@b.com", "pass")]
    [InlineData("alice", "", "pass")]
    [InlineData("alice", "a@b.com", "")]
    public async Task CreateAsync_Throws_WhenRequiredFieldMissing(string username, string email, string password)
    {
        var dto = new CreateUserDto { Username = username, Email = email, Password = password };

        await Assert.ThrowsAsync<Exception>(() => _sut.CreateAsync(dto));
        _userRepo.Verify(r => r.AddAsync(It.IsAny<User>()), Times.Never);
    }

    [Fact]
    public async Task CreateAsync_Throws_WhenUsernameTaken()
    {
        var dto = new CreateUserDto { Username = "alice", Email = "alice@test.com", Password = "pass" };
        _userRepo.Setup(r => r.UsernameExistsAsync("alice", null)).ReturnsAsync(true);

        var ex = await Assert.ThrowsAsync<Exception>(() => _sut.CreateAsync(dto));
        Assert.Contains("alice", ex.Message);
    }

    [Fact]
    public async Task CreateAsync_Throws_WhenEmailTaken()
    {
        var dto = new CreateUserDto { Username = "alice", Email = "dup@test.com", Password = "pass" };
        _userRepo.Setup(r => r.UsernameExistsAsync("alice", null)).ReturnsAsync(false);
        _userRepo.Setup(r => r.EmailExistsAsync("dup@test.com", null)).ReturnsAsync(true);

        var ex = await Assert.ThrowsAsync<Exception>(() => _sut.CreateAsync(dto));
        Assert.Contains("dup@test.com", ex.Message);
    }

    [Fact]
    public async Task CreateAsync_SetsCustomRole_WhenProvided()
    {
        var dto = new CreateUserDto { Username = "bob", Email = "bob@test.com", Password = "pass", Role = "Admin" };
        _userRepo.Setup(r => r.UsernameExistsAsync(It.IsAny<string>(), null)).ReturnsAsync(false);
        _userRepo.Setup(r => r.EmailExistsAsync(It.IsAny<string>(), null)).ReturnsAsync(false);
        _userRepo.Setup(r => r.AddAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

        var result = await _sut.CreateAsync(dto);

        Assert.Equal("Admin", result.Role);
    }

    // ══════════════════════════════════════════════
    //  UpdateAsync
    // ══════════════════════════════════════════════

    [Fact]
    public async Task UpdateAsync_UpdatesUser_WhenDataIsValid()
    {
        var user = MakeUser(1);
        var dto = new UpdateUserDto { Username = "newname", Email = "new@test.com" };
        _userRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
        _userRepo.Setup(r => r.UsernameExistsAsync("newname", 1)).ReturnsAsync(false);
        _userRepo.Setup(r => r.EmailExistsAsync("new@test.com", 1)).ReturnsAsync(false);
        _userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

        await _sut.UpdateAsync(1, dto);

        _userRepo.Verify(r => r.UpdateAsync(It.Is<User>(u =>
            u.Username == "newname" && u.Email == "new@test.com")), Times.Once);
    }

    [Fact]
    public async Task UpdateAsync_Throws_WhenUserNotFound()
    {
        _userRepo.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<Exception>(() =>
            _sut.UpdateAsync(99, new UpdateUserDto { Username = "x", Email = "x@x.com" }));
    }

    [Fact]
    public async Task UpdateAsync_HashesNewPassword_WhenProvided()
    {
        var user = MakeUser(1);
        var dto = new UpdateUserDto { Username = "user1", Email = "user1@example.com", Password = "NewPass1!" };
        _userRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
        _userRepo.Setup(r => r.UsernameExistsAsync(It.IsAny<string>(), 1)).ReturnsAsync(false);
        _userRepo.Setup(r => r.EmailExistsAsync(It.IsAny<string>(), 1)).ReturnsAsync(false);
        _userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

        await _sut.UpdateAsync(1, dto);

        User? capturedUser = null;
        _userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>()))
                 .Callback<User>(u => capturedUser = u)
                 .Returns(Task.CompletedTask);

        await _sut.UpdateAsync(1, dto);

        Assert.NotNull(capturedUser);
        Assert.True(BCrypt.Net.BCrypt.Verify("NewPass1!", capturedUser!.PasswordHash));
    }

    // ══════════════════════════════════════════════
    //  DeleteAsync
    // ══════════════════════════════════════════════

    [Fact]
    public async Task DeleteAsync_CallsRepository_WhenUserExists()
    {
        _userRepo.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(MakeUser(5));
        _userRepo.Setup(r => r.DeleteAsync(5)).Returns(Task.CompletedTask);

        await _sut.DeleteAsync(5);

        _userRepo.Verify(r => r.DeleteAsync(5), Times.Once);
    }

    [Fact]
    public async Task DeleteAsync_Throws_WhenUserNotFound()
    {
        _userRepo.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<Exception>(() => _sut.DeleteAsync(99));
        _userRepo.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
    }

    // ══════════════════════════════════════════════
    //  LoginAsync
    // ══════════════════════════════════════════════

    [Fact]
    public async Task LoginAsync_ReturnsTokens_WhenCredentialsValid()
    {
        var user = MakeUser(1);
        _userRepo.Setup(r => r.GetByEmailAsync("user1@example.com")).ReturnsAsync(user);
        _userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

        var (access, refresh) = await _sut.LoginAsync(
            new LoginDto { Email = "user1@example.com", Password = "Password1!" });

        Assert.NotEmpty(access);
        Assert.NotEmpty(refresh);
    }

    [Fact]
    public async Task LoginAsync_PersistsRefreshToken_ToUser()
    {
        var user = MakeUser(1);
        _userRepo.Setup(r => r.GetByEmailAsync("user1@example.com")).ReturnsAsync(user);
        _userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

        await _sut.LoginAsync(new LoginDto { Email = "user1@example.com", Password = "Password1!" });

        // FIX: Use .HasValue instead of != null comparison on DateTime? to avoid CS0854
        // (expression tree may not contain a call that uses optional arguments)
        _userRepo.Verify(r => r.UpdateAsync(It.Is<User>(u =>
            u.RefreshToken != null && u.RefreshTokenExpiry.HasValue && u.RefreshTokenExpiry.Value > DateTime.UtcNow)), Times.Once);
    }

    [Fact]
    public async Task LoginAsync_Throws_WhenEmailNotFound()
    {
        _userRepo.Setup(r => r.GetByEmailAsync(It.IsAny<string>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<Exception>(() =>
            _sut.LoginAsync(new LoginDto { Email = "nobody@test.com", Password = "pass" }));
    }

    [Fact]
    public async Task LoginAsync_Throws_WhenPasswordWrong()
    {
        var user = MakeUser(1);
        _userRepo.Setup(r => r.GetByEmailAsync("user1@example.com")).ReturnsAsync(user);

        await Assert.ThrowsAsync<Exception>(() =>
            _sut.LoginAsync(new LoginDto { Email = "user1@example.com", Password = "WrongPassword" }));
    }

    [Theory]
    [InlineData("", "pass")]
    [InlineData("a@b.com", "")]
    public async Task LoginAsync_Throws_WhenFieldsEmpty(string email, string password)
    {
        await Assert.ThrowsAsync<Exception>(() =>
            _sut.LoginAsync(new LoginDto { Email = email, Password = password }));
    }

    // ══════════════════════════════════════════════
    //  RefreshTokenAsync
    // ══════════════════════════════════════════════

    [Fact]
    public async Task RefreshTokenAsync_ReturnsNewTokens_ForValidUserRefreshToken()
    {
        var user = MakeUser(1);
        user.RefreshToken = "valid-refresh-token";
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(3);
        _userRepo.Setup(r => r.GetByRefreshTokenAsync("valid-refresh-token")).ReturnsAsync(user);
        _userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

        var (access, refresh) = await _sut.RefreshTokenAsync("valid-refresh-token");

        Assert.NotEmpty(access);
        Assert.NotEmpty(refresh);
        Assert.NotEqual("valid-refresh-token", refresh); // should be rotated
    }

    [Fact]
    public async Task RefreshTokenAsync_Throws_WhenTokenExpired()
    {
        var user = MakeUser(1);
        user.RefreshToken = "expired-token";
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(-1);  // already expired
        _userRepo.Setup(r => r.GetByRefreshTokenAsync("expired-token")).ReturnsAsync(user);

        var ex = await Assert.ThrowsAsync<Exception>(() => _sut.RefreshTokenAsync("expired-token"));
        Assert.Contains("expired", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task RefreshTokenAsync_Throws_WhenTokenNotFound()
    {
        _userRepo.Setup(r => r.GetByRefreshTokenAsync(It.IsAny<string>())).ReturnsAsync((User?)null);
        _oAuthRepo.Setup(r => r.GetByRefreshTokenAsync(It.IsAny<string>())).ReturnsAsync((OAuthUser?)null);

        await Assert.ThrowsAsync<Exception>(() => _sut.RefreshTokenAsync("nonexistent"));
    }

    [Fact]
    public async Task RefreshTokenAsync_Throws_WhenTokenIsEmpty()
    {
        await Assert.ThrowsAsync<Exception>(() => _sut.RefreshTokenAsync(string.Empty));
    }

    // ══════════════════════════════════════════════
    //  LogoutAsync
    // ══════════════════════════════════════════════

    [Fact]
    public async Task LogoutAsync_ClearsRefreshToken_ForRegularUser()
    {
        var user = MakeUser(1);
        user.RefreshToken = "my-token";
        _userRepo.Setup(r => r.GetByRefreshTokenAsync("my-token")).ReturnsAsync(user);
        _userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

        await _sut.LogoutAsync("my-token");

        // FIX: Use !.HasValue instead of == null on DateTime? to avoid CS0854
        _userRepo.Verify(r => r.UpdateAsync(It.Is<User>(u =>
            u.RefreshToken == null && !u.RefreshTokenExpiry.HasValue)), Times.Once);
    }

    [Fact]
    public async Task LogoutAsync_ClearsRefreshToken_ForOAuthUser()
    {
        var oAuthUser = new OAuthUser
        {
            OAuthUserId = 10,
            Email = "oauth@test.com",
            Username = "oauthuser",
            Role = "User",
            GoogleId = "gid123",
            AccessToken = "acc",
            RefreshToken = "oauth-refresh"
        };
        _userRepo.Setup(r => r.GetByRefreshTokenAsync("oauth-refresh")).ReturnsAsync((User?)null);
        _oAuthRepo.Setup(r => r.GetByRefreshTokenAsync("oauth-refresh")).ReturnsAsync(oAuthUser);
        _oAuthRepo.Setup(r => r.UpdateAsync(It.IsAny<OAuthUser>())).Returns(Task.CompletedTask);

        await _sut.LogoutAsync("oauth-refresh");

        _oAuthRepo.Verify(r => r.UpdateAsync(It.Is<OAuthUser>(u => u.RefreshToken == null)), Times.Once);
    }

    [Fact]
    public async Task LogoutAsync_DoesNothing_WhenTokenIsEmpty()
    {
        await _sut.LogoutAsync(string.Empty);   // should not throw

        _userRepo.Verify(r => r.UpdateAsync(It.IsAny<User>()), Times.Never);
        _oAuthRepo.Verify(r => r.UpdateAsync(It.IsAny<OAuthUser>()), Times.Never);
    }

    // ══════════════════════════════════════════════
    //  GetCurrentUserAsync
    // ══════════════════════════════════════════════

    [Fact]
    public async Task GetCurrentUserAsync_ReturnsUser_WhenIdentityIsAuthenticated()
    {
        var user = MakeUser(1);
        var identity = new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.Email, "user1@example.com") },
            "TestAuth");
        _userRepo.Setup(r => r.GetByEmailAsync("user1@example.com")).ReturnsAsync(user);

        var result = await _sut.GetCurrentUserAsync(identity);

        Assert.Equal(1, result.UserId);
        Assert.Equal("user1@example.com", result.Email);
    }

    [Fact]
    public async Task GetCurrentUserAsync_Throws_WhenIdentityIsNull()
    {
        await Assert.ThrowsAsync<Exception>(() => _sut.GetCurrentUserAsync(null!));
    }

    [Fact]
    public async Task GetCurrentUserAsync_Throws_WhenIdentityIsNotAuthenticated()
    {
        var identity = new ClaimsIdentity(); // unauthenticated (no authenticationType)

        await Assert.ThrowsAsync<Exception>(() => _sut.GetCurrentUserAsync(identity));
    }

    [Fact]
    public async Task GetCurrentUserAsync_Throws_WhenEmailClaimMissing()
    {
        var identity = new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.Name, "alice") },
            "TestAuth");

        await Assert.ThrowsAsync<Exception>(() => _sut.GetCurrentUserAsync(identity));
    }

    [Fact]
    public async Task GetCurrentUserAsync_Throws_WhenUserNotInDatabase()
    {
        var identity = new ClaimsIdentity(
            new[] { new Claim(ClaimTypes.Email, "ghost@test.com") },
            "TestAuth");
        _userRepo.Setup(r => r.GetByEmailAsync("ghost@test.com")).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<Exception>(() => _sut.GetCurrentUserAsync(identity));
    }

    // ══════════════════════════════════════════════
    //  VerifyOtpAndGenerateJwt
    // ══════════════════════════════════════════════

    [Fact]
    public async Task VerifyOtpAndGenerateJwt_ReturnsTokens_WhenOtpIsValid()
    {
        var user = MakeUser(1);
        var otp = MakeOtp("user1@example.com", 123456);
        _otpRepo.Setup(r => r.GetLatestOtp("user1@example.com")).ReturnsAsync(otp);
        _otpRepo.Setup(r => r.MarkUse(otp.OtpId)).Returns(Task.CompletedTask);
        _userRepo.Setup(r => r.GetByEmailAsync("user1@example.com")).ReturnsAsync(user);
        _userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

        var (access, refresh) = await _sut.VerifyOtpAndGenerateJwt(
            new OtpDto { Email = "user1@example.com", Otp = 123456 });

        Assert.NotEmpty(access);
        Assert.NotEmpty(refresh);
        _otpRepo.Verify(r => r.MarkUse(otp.OtpId), Times.Once);
    }

    [Fact]
    public async Task VerifyOtpAndGenerateJwt_Throws_WhenOtpNotFound()
    {
        _otpRepo.Setup(r => r.GetLatestOtp(It.IsAny<string>())).ReturnsAsync((UserOtp?)null);

        await Assert.ThrowsAsync<Exception>(() =>
            _sut.VerifyOtpAndGenerateJwt(new OtpDto { Email = "x@x.com", Otp = 0 }));
    }

    [Fact]
    public async Task VerifyOtpAndGenerateJwt_Throws_WhenOtpAlreadyUsed()
    {
        var otp = MakeOtp("user1@example.com", 123456, isUsed: true);
        _otpRepo.Setup(r => r.GetLatestOtp("user1@example.com")).ReturnsAsync(otp);

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            _sut.VerifyOtpAndGenerateJwt(new OtpDto { Email = "user1@example.com", Otp = 123456 }));
        Assert.Contains("already used", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task VerifyOtpAndGenerateJwt_Throws_WhenOtpExpired()
    {
        var otp = MakeOtp("user1@example.com", 123456, minutesUntilExpiry: -10);  // expired
        _otpRepo.Setup(r => r.GetLatestOtp("user1@example.com")).ReturnsAsync(otp);

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            _sut.VerifyOtpAndGenerateJwt(new OtpDto { Email = "user1@example.com", Otp = 123456 }));
        Assert.Contains("expired", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task VerifyOtpAndGenerateJwt_Throws_WhenOtpCodeWrong()
    {
        var otp = MakeOtp("user1@example.com", 123456);
        _otpRepo.Setup(r => r.GetLatestOtp("user1@example.com")).ReturnsAsync(otp);

        var ex = await Assert.ThrowsAsync<Exception>(() =>
            _sut.VerifyOtpAndGenerateJwt(new OtpDto { Email = "user1@example.com", Otp = 999999 }));
        Assert.Contains("Invalid", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    // ══════════════════════════════════════════════
    //  GetTourStatusAsync / MarkTourCompletedAsync
    // ══════════════════════════════════════════════

    [Fact]
    public async Task GetTourStatusAsync_ReturnsFalse_WhenNotCompleted()
    {
        var user = MakeUser(1);
        user.IsTourCompleted = false;
        _userRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);

        var result = await _sut.GetTourStatusAsync(1);

        Assert.False(result);
    }

    [Fact]
    public async Task GetTourStatusAsync_ReturnsTrue_WhenCompleted()
    {
        var user = MakeUser(1);
        user.IsTourCompleted = true;
        _userRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);

        var result = await _sut.GetTourStatusAsync(1);

        Assert.True(result);
    }

    [Fact]
    public async Task GetTourStatusAsync_Throws_WhenUserNotFound()
    {
        _userRepo.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<Exception>(() => _sut.GetTourStatusAsync(99));
    }

    [Fact]
    public async Task MarkTourCompletedAsync_SetsFlagTrue()
    {
        var user = MakeUser(1);
        user.IsTourCompleted = false;
        _userRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
        _userRepo.Setup(r => r.UpdateAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

        await _sut.MarkTourCompletedAsync(1);

        _userRepo.Verify(r => r.UpdateAsync(It.Is<User>(u => u.IsTourCompleted)), Times.Once);
    }

    [Fact]
    public async Task MarkTourCompletedAsync_Throws_WhenUserNotFound()
    {
        _userRepo.Setup(r => r.GetByIdAsync(55)).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<Exception>(() => _sut.MarkTourCompletedAsync(55));
    }

    // ══════════════════════════════════════════════
    //  UpdateUserRoleAsync
    // ══════════════════════════════════════════════

    [Theory]
    [InlineData("Admin")]
    [InlineData("User")]
    [InlineData("Operator")]
    [InlineData("Engineer")]
    public async Task UpdateUserRoleAsync_UpdatesRole_WhenRoleIsValid(string role)
    {
        var user = MakeUser(1);
        _userRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(user);
        _userRepo.Setup(r => r.SaveChangesAsync()).Returns(Task.CompletedTask);

        await _sut.UpdateUserRoleAsync(1, role);

        Assert.Equal(role, user.Role);
        _userRepo.Verify(r => r.SaveChangesAsync(), Times.Once);
    }

    [Fact]
    public async Task UpdateUserRoleAsync_Throws_WhenRoleIsInvalid()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _sut.UpdateUserRoleAsync(1, "SuperAdmin"));
    }

    [Fact]
    public async Task UpdateUserRoleAsync_Throws_WhenRoleIsEmpty()
    {
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _sut.UpdateUserRoleAsync(1, string.Empty));
    }

    [Fact]
    public async Task UpdateUserRoleAsync_Throws_WhenUserNotFound()
    {
        _userRepo.Setup(r => r.GetByIdAsync(99)).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            _sut.UpdateUserRoleAsync(99, "User"));
    }
}