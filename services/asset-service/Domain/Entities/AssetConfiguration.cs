using System;
using System.ComponentModel.DataAnnotations;

namespace Domain.Entities
{
    public class AssetConfiguration
    {
        [Key]
        public Guid AssetConfigId { get; set; } = Guid.NewGuid();

        public Guid AssetId { get; set; }

        public Guid SignaTypeID { get; set; }

        public Asset Asset { get; set; } = null!;

        public SignalTypes SignalType { get; set; } = null!;
    }
}