using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SignalNameinRegister : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SignalTypeId",
                table: "OpcUaNodes");

            migrationBuilder.AddColumn<string>(
                name: "SignalName",
                table: "Registers",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SignalName",
                table: "Registers");

            migrationBuilder.AddColumn<Guid>(
                name: "SignalTypeId",
                table: "OpcUaNodes",
                type: "uniqueidentifier",
                nullable: true);
        }
    }
}
