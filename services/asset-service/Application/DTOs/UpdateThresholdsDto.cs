using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.DTOs
{
    public class UpdateThresholdsDto
    {
        public double? MinThreshold { get; set; }
        public double? MaxThreshold { get; set; }
    }
}
