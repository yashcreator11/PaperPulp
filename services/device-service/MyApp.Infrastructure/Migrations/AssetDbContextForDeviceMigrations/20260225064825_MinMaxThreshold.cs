using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyApp.Infrastructure.Migrations.AssetDbContextForDeviceMigrations
{
    /// <inheritdoc />
    public partial class MinMaxThreshold : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SignalTypeId",
                table: "Signals");

            migrationBuilder.AddColumn<double>(
                name: "MaxThreshold",
                table: "Signals",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "MinThreshold",
                table: "Signals",
                type: "float",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "OpcUaNodeId",
                table: "Signals",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RegisterId",
                table: "Signals",
                type: "uniqueidentifier",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxThreshold",
                table: "Signals");

            migrationBuilder.DropColumn(
                name: "MinThreshold",
                table: "Signals");

            migrationBuilder.DropColumn(
                name: "OpcUaNodeId",
                table: "Signals");

            migrationBuilder.DropColumn(
                name: "RegisterId",
                table: "Signals");

            migrationBuilder.AddColumn<Guid>(
                name: "SignalTypeId",
                table: "Signals",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
        }
    }
}
