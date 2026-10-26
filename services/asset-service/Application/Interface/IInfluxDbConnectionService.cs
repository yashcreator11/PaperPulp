using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using InfluxDB.Client;

namespace Application.Interface
{
    public interface IInfluxDbConnectionService
    {
        InfluxDBClient GetClient();
        Task<bool> TryInitializeAsync();
    }
}
