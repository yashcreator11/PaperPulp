using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MyApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddSlaveIdToDeviceSlave : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte>(
                name: "SlaveId",
                table: "DeviceSlaves",
                type: "tinyint",
                nullable: false,
                defaultValue: (byte)0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SlaveId",
                table: "DeviceSlaves");
        }
    }
}
