using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BaudRate",
                table: "DeviceConfigurations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ModbusMode",
                table: "DeviceConfigurations",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Parity",
                table: "DeviceConfigurations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SerialPort",
                table: "DeviceConfigurations",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BaudRate",
                table: "DeviceConfigurations");

            migrationBuilder.DropColumn(
                name: "ModbusMode",
                table: "DeviceConfigurations");

            migrationBuilder.DropColumn(
                name: "Parity",
                table: "DeviceConfigurations");

            migrationBuilder.DropColumn(
                name: "SerialPort",
                table: "DeviceConfigurations");
        }
    }
}
