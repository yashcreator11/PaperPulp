using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Domain.Entities
{
    public class User
    {
        [Key]
        [Column("UserId")]
        public int Id { get; set; } // Changed from string to int

        public string UserName { get; set; } = "";
        public string Email { get; set; } = "";
    }
}
