namespace AuthMicroservice.Application
{
    public class JwtOptions
    {
        public const string SectionName = "Jwt";
        public string Key { get; set; } = string.Empty;
        public string EncryptionKey { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public string Audience { get; set; } = string.Empty;

        public byte[] KeyBytes()
        {
            if (string.IsNullOrWhiteSpace(Key))
                throw new InvalidOperationException(
                    "Jwt:Key is not configured. Set the JWT__KEY environment variable.");
            return System.Text.Encoding.UTF8.GetBytes(Key);
        }

        public byte[] EncryptionKeyBytes()
        {
            if (string.IsNullOrWhiteSpace(EncryptionKey))
                throw new InvalidOperationException(
                    "Jwt:EncryptionKey is not configured. Set the JWT__ENCRYPTIONKEY environment variable.");
            return System.Text.Encoding.UTF8.GetBytes(EncryptionKey);
        }
    }
}