using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interface
{
    public interface ILookupService
    {
        Task<Dictionary<Guid, string>> GetAssetMapAsync();
        Task<Dictionary<Guid, string>> GetSignalMapAsync();
    }
}
