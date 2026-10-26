using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Configuration
{
    public class InfluxDbOptions
    {
        public string InfluxUrl { get; set; } = string.Empty;

        public string InfluxToken { get; set; } = string.Empty;

        public string InfluxOrg { get; set; } = string.Empty;

        public string InfluxBucket { get; set; } = string.Empty;

        public int InfluxTimout { get; set; }

        public int ExcelMaxRows { get; set; }

        public int CsvMaxRows { get; set; }
    }
}
