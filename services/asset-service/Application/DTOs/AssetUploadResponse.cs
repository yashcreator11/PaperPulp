using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.DTOs
{
    public class AssetUploadResponse
    {
        public List<string> AddedAssets { get; set; } = new List<string>();
        public List<string> SkippedAssets { get; set; } = new List<string>();
    }
}
