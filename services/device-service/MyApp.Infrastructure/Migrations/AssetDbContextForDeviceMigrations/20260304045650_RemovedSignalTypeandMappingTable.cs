using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyApp.Infrastructure.Migrations.AssetDbContextForDeviceMigrations
{
    /// <inheritdoc />
    public partial class RemovedSignalTypeandMappingTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MappingTable");

            migrationBuilder.DropTable(
                name: "SignalTypes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MappingTable",
                columns: table => new
                {
                    MappingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeviceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DevicePortId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OpcUaNodeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RegisterAdress = table.Column<int>(type: "int", nullable: true),
                    SignalName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SignalTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalUnit = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    registerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MappingTable", x => x.MappingId);
                });

            migrationBuilder.CreateTable(
                name: "SignalTypes",
                columns: table => new
                {
                    SignalTypeID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DefaultRegisterAdress = table.Column<int>(type: "int", nullable: true),
                    MaxThreshold = table.Column<double>(type: "float", nullable: true),
                    MinThreshold = table.Column<double>(type: "float", nullable: true),
                    SignalName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SignalUnit = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SignalTypes", x => x.SignalTypeID);
                });
        }
    }
}
