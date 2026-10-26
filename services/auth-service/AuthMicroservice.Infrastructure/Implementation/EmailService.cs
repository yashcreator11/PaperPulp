using AuthMicroservice.Application.Interface;
using Microsoft.Extensions.Configuration;
using MailKit.Security;
using MimeKit;

namespace AuthMicroservice.Infrastructure.Implementation
{
    public class EmailService : IEamilService
    {
        private readonly string _email;
        private readonly string _password;

        public EmailService(IConfiguration config)
        {
            _email = config["Smtp-Server:Senders-email"]
                ?? throw new InvalidOperationException("Smtp-Server:Senders-email is not configured.");
            _password = config["Smtp-Server:Senders-passwords"]
                ?? throw new InvalidOperationException("Smtp-Server:Senders-passwords is not configured.");
        }

        public async Task SendEmailAsync(string toEmail, string subject, string message)
        {
            var email = new MimeMessage();
            email.From.Add(MailboxAddress.Parse(_email));
            email.To.Add(MailboxAddress.Parse(toEmail));
            email.Subject = subject;
            email.Body = new TextPart("plain") { Text = message };

            using var smtp = new MailKit.Net.Smtp.SmtpClient();
            await smtp.ConnectAsync("smtp.gmail.com", 587, SecureSocketOptions.StartTls);
            await smtp.AuthenticateAsync(_email, _password);
            await smtp.SendAsync(email);
            await smtp.DisconnectAsync(true);
        }
    }
}