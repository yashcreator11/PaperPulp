using Application.Interface;
using Domain.Entities;
using Infrastructure.DBs;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Service
{
    public class AlertAnalysisRepository : IAlertAnalysisRepository
    {
        private readonly DBContext _db;

        public AlertAnalysisRepository(DBContext db)
        {
            _db = db;
        }

       

        public async Task CreateAsync(AlertAnalysis analysis)
        {
            _db.AlertAnalyses.Add(analysis);
            await _db.SaveChangesAsync();
        }
    }

}
