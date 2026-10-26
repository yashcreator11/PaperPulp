using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAssetConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AssetConfiguration");

            migrationBuilder.DropTable(
                name: "SignalTypes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SignalTypes",
                columns: table => new
                {
                    SignalTypeID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DefaultRegisterAdress = table.Column<int>(type: "int", nullable: false),
                    MaxThreshold = table.Column<double>(type: "float", nullable: false),
                    MinThreshold = table.Column<double>(type: "float", nullable: false),
                    SignalName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SignalUnit = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SignalTypes", x => x.SignalTypeID);
                });

            migrationBuilder.CreateTable(
                name: "AssetConfiguration",
                columns: table => new
                {
                    AssetConfigId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalTypeID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignaTypeID = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssetConfiguration", x => x.AssetConfigId);
                    table.ForeignKey(
                        name: "FK_AssetConfiguration_Assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "Assets",
                        principalColumn: "AssetId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AssetConfiguration_SignalTypes_SignalTypeID",
                        column: x => x.SignalTypeID,
                        principalTable: "SignalTypes",
                        principalColumn: "SignalTypeID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AssetConfiguration_AssetId",
                table: "AssetConfiguration",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetConfiguration_SignalTypeID",
                table: "AssetConfiguration",
                column: "SignalTypeID");
        }
    }
}
