using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyApp.Infrastructure.Migrations.AssetDbContextForDeviceMigrations
{
    /// <inheritdoc />
    public partial class AssetDbFix : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SignalTypeId",
                table: "Signals",
                type: "uniqueidentifier",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SignalTypeId",
                table: "Signals");
        }
    }
}
