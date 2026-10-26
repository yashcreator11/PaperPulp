using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOpcUaNodeIdToMapping2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AlertAnalyses",
                columns: table => new
                {
                    AlertAnalysisId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssetName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FromUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ToUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RecommendedActions = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AnalyzedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AlertAnalyses", x => x.AlertAnalysisId);
                });

            migrationBuilder.CreateTable(
                name: "Alerts",
                columns: table => new
                {
                    AlertId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssetName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SignalTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SignalId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MappingId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AlertStartUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AlertEndUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    MinThreshold = table.Column<double>(type: "float", nullable: false),
                    MaxThreshold = table.Column<double>(type: "float", nullable: false),
                    MinObservedValue = table.Column<double>(type: "float", nullable: false),
                    MaxObservedValue = table.Column<double>(type: "float", nullable: false),
                    ReminderTimeHours = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    IsAnalyzed = table.Column<bool>(type: "bit", nullable: false),
                    CreatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Alerts", x => x.AlertId);
                });

            migrationBuilder.CreateTable(
                name: "Assets",
                columns: table => new
                {
                    AssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    ParentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Level = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Assets", x => x.AssetId);
                    table.ForeignKey(
                        name: "FK_Assets_Assets_ParentId",
                        column: x => x.ParentId,
                        principalTable: "Assets",
                        principalColumn: "AssetId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MappingTable",
                columns: table => new
                {
                    MappingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeviceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DevicePortId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalUnit = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SignalName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RegisterAdress = table.Column<int>(type: "int", nullable: false),
                    registerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OpcUaNodeId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MappingTable", x => x.MappingId);
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notifications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ReportRequests",
                columns: table => new
                {
                    ReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssetName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SignalIds = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FilePath = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportRequests", x => x.ReportId);
                });

            migrationBuilder.CreateTable(
                name: "SignalData",
                columns: table => new
                {
                    SignalDataId = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeviceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DevicePortId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SignalUnit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    RegisterAddress = table.Column<int>(type: "int", nullable: true),
                    BucketStartUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Count = table.Column<int>(type: "int", nullable: false),
                    Sum = table.Column<double>(type: "float", nullable: false),
                    MinValue = table.Column<double>(type: "float", nullable: true),
                    MaxValue = table.Column<double>(type: "float", nullable: true),
                    AvgValue = table.Column<double>(type: "float", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SignalData", x => x.SignalDataId);
                });

            migrationBuilder.CreateTable(
                name: "SignalTypes",
                columns: table => new
                {
                    SignalTypeID = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SignalUnit = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DefaultRegisterAdress = table.Column<int>(type: "int", nullable: false),
                    MinThreshold = table.Column<double>(type: "float", nullable: false),
                    MaxThreshold = table.Column<double>(type: "float", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SignalTypes", x => x.SignalTypeID);
                });

            migrationBuilder.CreateTable(
                name: "NotificationRecipients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    NotificationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    IsAcknowledged = table.Column<bool>(type: "bit", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AcknowledgedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationRecipients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotificationRecipients_Notifications_NotificationId",
                        column: x => x.NotificationId,
                        principalTable: "Notifications",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AssetConfigurations",
                columns: table => new
                {
                    AssetConfigId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignaTypeID = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssetConfigurations", x => x.AssetConfigId);
                    table.ForeignKey(
                        name: "FK_AssetConfigurations_Assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "Assets",
                        principalColumn: "AssetId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AssetConfigurations_SignalTypes_SignaTypeID",
                        column: x => x.SignaTypeID,
                        principalTable: "SignalTypes",
                        principalColumn: "SignalTypeID",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Signals",
                columns: table => new
                {
                    SignalId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalKey = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    AssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeviceId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SignalName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SignalTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Signals", x => x.SignalId);
                    table.ForeignKey(
                        name: "FK_Signals_SignalTypes_SignalTypeId",
                        column: x => x.SignalTypeId,
                        principalTable: "SignalTypes",
                        principalColumn: "SignalTypeID",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Alert_Signal_Active",
                table: "Alerts",
                columns: new[] { "SignalId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Alerts_AlertStartUtc",
                table: "Alerts",
                column: "AlertStartUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Alerts_AssetId_IsAnalyzed",
                table: "Alerts",
                columns: new[] { "AssetId", "IsAnalyzed" });

            migrationBuilder.CreateIndex(
                name: "IX_Alerts_MappingId_IsActive",
                table: "Alerts",
                columns: new[] { "MappingId", "IsActive" });

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
                name: "IX_Assets_Name",
                table: "Assets",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Assets_ParentId",
                table: "Assets",
                column: "ParentId");

            migrationBuilder.CreateIndex(
                name: "IX_Mapping_Asset_Signal",
                table: "MappingTable",
                columns: new[] { "AssetId", "SignalTypeId" });

            migrationBuilder.CreateIndex(
                name: "IX_Mapping_Device_Port",
                table: "MappingTable",
                columns: new[] { "DeviceId", "DevicePortId" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationRecipients_NotificationId",
                table: "NotificationRecipients",
                column: "NotificationId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationRecipients_UserId_CreatedAt",
                table: "NotificationRecipients",
                columns: new[] { "UserId", "CreatedAt" });

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

            migrationBuilder.CreateIndex(
                name: "IX_Signals_SignalTypeId",
                table: "Signals",
                column: "SignalTypeId");

            migrationBuilder.CreateIndex(
                name: "UX_Signal_AssetDeviceKey",
                table: "Signals",
                columns: new[] { "AssetId", "DeviceId", "SignalKey" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AlertAnalyses");

            migrationBuilder.DropTable(
                name: "Alerts");

            migrationBuilder.DropTable(
                name: "AssetConfigurations");

            migrationBuilder.DropTable(
                name: "MappingTable");

            migrationBuilder.DropTable(
                name: "NotificationRecipients");

            migrationBuilder.DropTable(
                name: "ReportRequests");

            migrationBuilder.DropTable(
                name: "SignalData");

            migrationBuilder.DropTable(
                name: "Signals");

            migrationBuilder.DropTable(
                name: "Assets");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "SignalTypes");
        }
    }
}
