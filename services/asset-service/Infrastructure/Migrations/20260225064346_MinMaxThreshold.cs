using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MinMaxThreshold : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Signals_SignalTypes_SignalTypeId",
                table: "Signals");

            migrationBuilder.DropIndex(
                name: "IX_Signals_SignalTypeId",
                table: "Signals");

            migrationBuilder.DropColumn(
                name: "SignalTypeId",
                table: "Signals");

            migrationBuilder.AlterColumn<string>(
                name: "Unit",
                table: "Signals",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);

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

            migrationBuilder.CreateIndex(
                name: "IX_Signal_DeviceId",
                table: "Signals",
                column: "DeviceId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Signal_DeviceId",
                table: "Signals");

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

            migrationBuilder.AlterColumn<string>(
                name: "Unit",
                table: "Signals",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SignalTypeId",
                table: "Signals",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Signals_SignalTypeId",
                table: "Signals",
                column: "SignalTypeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Signals_SignalTypes_SignalTypeId",
                table: "Signals",
                column: "SignalTypeId",
                principalTable: "SignalTypes",
                principalColumn: "SignalTypeID",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
