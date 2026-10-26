using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixPendingChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AssetConfigurations_Assets_AssetId",
                table: "AssetConfigurations");

            migrationBuilder.DropForeignKey(
                name: "FK_AssetConfigurations_SignalTypes_SignaTypeID",
                table: "AssetConfigurations");

            migrationBuilder.DropTable(
                name: "MappingTable");

            migrationBuilder.DropTable(
                name: "SignalData");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AssetConfigurations",
                table: "AssetConfigurations");

            migrationBuilder.DropIndex(
                name: "IX_AssetConfigurations_AssetId_SignaTypeID",
                table: "AssetConfigurations");

            migrationBuilder.DropIndex(
                name: "IX_AssetConfigurations_SignaTypeID",
                table: "AssetConfigurations");

            migrationBuilder.RenameTable(
                name: "AssetConfigurations",
                newName: "AssetConfiguration");

            migrationBuilder.AddColumn<Guid>(
                name: "SignalTypeID",
                table: "AssetConfiguration",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddPrimaryKey(
                name: "PK_AssetConfiguration",
                table: "AssetConfiguration",
                column: "AssetConfigId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetConfiguration_AssetId",
                table: "AssetConfiguration",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetConfiguration_SignalTypeID",
                table: "AssetConfiguration",
                column: "SignalTypeID");

            migrationBuilder.AddForeignKey(
                name: "FK_AssetConfiguration_Assets_AssetId",
                table: "AssetConfiguration",
                column: "AssetId",
                principalTable: "Assets",
                principalColumn: "AssetId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AssetConfiguration_SignalTypes_SignalTypeID",
                table: "AssetConfiguration",
                column: "SignalTypeID",
                principalTable: "SignalTypes",
                principalColumn: "SignalTypeID",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AssetConfiguration_Assets_AssetId",
                table: "AssetConfiguration");

            migrationBuilder.DropForeignKey(
                name: "FK_AssetConfiguration_SignalTypes_SignalTypeID",
                table: "AssetConfiguration");

            migrationBuilder.DropPrimaryKey(
                name: "PK_AssetConfiguration",
                table: "AssetConfiguration");

            migrationBuilder.DropIndex(
                name: "IX_AssetConfiguration_AssetId",
                table: "AssetConfiguration");

            migrationBuilder.DropIndex(
                name: "IX_AssetConfiguration_SignalTypeID",
                table: "AssetConfiguration");

            migrationBuilder.DropColumn(
                name: "SignalTypeID",
                table: "AssetConfiguration");

            migrationBuilder.RenameTable(
                name: "AssetConfiguration",
                newName: "AssetConfigurations");

            migrationBuilder.AddPrimaryKey(
                name: "PK_AssetConfigurations",
                table: "AssetConfigurations",
                column: "AssetConfigId");

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
                    SignalName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SignalTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalUnit = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    registerId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MappingTable", x => x.MappingId);
                });

            migrationBuilder.CreateTable(
                name: "SignalData",
                columns: table => new
                {
                    SignalDataId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AvgValue = table.Column<double>(type: "float", nullable: true),
                    BucketStartUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Count = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DeviceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DevicePortId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MaxValue = table.Column<double>(type: "float", nullable: true),
                    MinValue = table.Column<double>(type: "float", nullable: true),
                    RegisterAddress = table.Column<int>(type: "int", nullable: true),
                    SignalName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SignalTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalUnit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Sum = table.Column<double>(type: "float", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SignalData", x => x.SignalDataId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AssetConfigurations_AssetId_SignaTypeID",
                table: "AssetConfigurations",
                columns: new[] { "AssetId", "SignaTypeID" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssetConfigurations_SignaTypeID",
                table: "AssetConfigurations",
                column: "SignaTypeID");

            migrationBuilder.CreateIndex(
                name: "IX_Mapping_Asset_Signal",
                table: "MappingTable",
                columns: new[] { "AssetId", "SignalTypeId" });

            migrationBuilder.CreateIndex(
                name: "IX_Mapping_Device_Port",
                table: "MappingTable",
                columns: new[] { "DeviceId", "DevicePortId" });

            migrationBuilder.CreateIndex(
                name: "IX_SignalData_Asset_Bucket",
                table: "SignalData",
                columns: new[] { "AssetId", "BucketStartUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_SignalData_Device_Bucket",
                table: "SignalData",
                columns: new[] { "DeviceId", "DevicePortId", "BucketStartUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_SignalData_SignalType_Bucket",
                table: "SignalData",
                columns: new[] { "SignalTypeId", "BucketStartUtc" });

            migrationBuilder.CreateIndex(
                name: "UX_SignalData_BucketKey",
                table: "SignalData",
                columns: new[] { "AssetId", "SignalTypeId", "DeviceId", "DevicePortId", "BucketStartUtc" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_AssetConfigurations_Assets_AssetId",
                table: "AssetConfigurations",
                column: "AssetId",
                principalTable: "Assets",
                principalColumn: "AssetId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_AssetConfigurations_SignalTypes_SignaTypeID",
                table: "AssetConfigurations",
                column: "SignaTypeID",
                principalTable: "SignalTypes",
                principalColumn: "SignalTypeID",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
