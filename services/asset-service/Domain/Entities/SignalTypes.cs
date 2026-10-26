using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Entities
{
    public class SignalTypes
    {
        [Required]
        [Key]
        public Guid SignalTypeID { get; set; } = Guid.NewGuid();

        [Required]
        public string SignalName { get; set; } = null!;

        [Required]
        public string SignalUnit { get; set; } = null!;

        public int DefaultRegisterAdress { get; set; }

        public double MinThreshold { get; set; }
        public double MaxThreshold { get; set; }

        public ICollection<AssetConfiguration> AssetConfigurations { get; set; } = new List<AssetConfiguration>();
    }
}