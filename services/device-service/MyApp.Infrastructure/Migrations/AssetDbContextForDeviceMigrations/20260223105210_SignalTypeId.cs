using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyApp.Infrastructure.Migrations.AssetDbContextForDeviceMigrations
{
    /// <inheritdoc />
    public partial class SignalTypeId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MappingTable",
                columns: table => new
                {
                    MappingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeviceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DevicePortId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SignalUnit = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SignalName = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RegisterAdress = table.Column<int>(type: "int", nullable: true),
                    registerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OpcUaNodeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MappingTable", x => x.MappingId);
                });

            migrationBuilder.CreateTable(
                name: "Signals",
                columns: table => new
                {
                    SignalId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalKey = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeviceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SignalTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Signals", x => x.SignalId);
                });

            migrationBuilder.CreateTable(
                name: "SignalTypes",
                columns: table => new
                {
                    SignalTypeID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SignalUnit = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DefaultRegisterAdress = table.Column<int>(type: "int", nullable: true),
                    MinThreshold = table.Column<double>(type: "float", nullable: true),
                    MaxThreshold = table.Column<double>(type: "float", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SignalTypes", x => x.SignalTypeID);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MappingTable");

            migrationBuilder.DropTable(
                name: "Signals");

            migrationBuilder.DropTable(
                name: "SignalTypes");
        }
    }
}
