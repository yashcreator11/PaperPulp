using Infrastructure.DBs;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System;

namespace TataPlantAsset.Application.Tests.Fixtures
{
    public class DbContextFixture
    {
        public DBContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<DBContext>() 
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            return new DBContext(options);
        }
    }
}
