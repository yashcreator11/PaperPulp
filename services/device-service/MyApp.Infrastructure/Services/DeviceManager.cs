using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using MyApp.Application.Dtos;
using MyApp.Application.Interfaces;
using MyApp.Domain.Entities;
using MyApp.Infrastructure.Data;
using System.Text.Json;
using MyApp.Application.Dtos.DeviceMatching;
using System.Text.RegularExpressions;

namespace MyApp.Infrastructure.Services
{
    public class DeviceManager : IDeviceManager
    {
        private readonly AppDbContext _db;
        private readonly ILogger<DeviceManager> _log;
        private readonly AssetDbContextForDevice _assetDb;
        private const int MaxAddresses = 200;

        private static readonly Regex ValidSerialPortRegex = new(
            @"^(COM\d{1,3}|/dev/tty(S|USB|ACM|AMA)\d{1,3})$",
            RegexOptions.IgnoreCase | RegexOptions.Compiled);

        public DeviceManager(AppDbContext db, ILogger<DeviceManager> log,
                             AssetDbContextForDevice assetDb)
        {
            _db = db;
            _log = log;
            _assetDb = assetDb; 
        }

        // ── Shared RTU validation ─────────────────────────────────────────
        private static readonly int[] ValidBaudRates = { 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200 };
        private static readonly string[] ValidParities = { "None", "Even", "Odd" };
        private static readonly Regex SerialPortRegex = new(@"^(COM\d{1,3}|/dev/tty\w+)$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static void ValidateModbusRtu(string? serialPort, int? baudRate, string? parity, int? slaveId)
        {
            if (string.IsNullOrWhiteSpace(serialPort))
                throw new ArgumentException("SerialPort is required for Modbus RTU.");

            if (!SerialPortRegex.IsMatch(serialPort.Trim()))
                throw new ArgumentException("SerialPort must be a valid port name e.g. COM1 or /dev/ttyUSB0.");

            if (!baudRate.HasValue)
                throw new ArgumentException("BaudRate is required for Modbus RTU.");

            if (!ValidBaudRates.Contains(baudRate.Value))
                throw new ArgumentException("BaudRate must be one of: 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200.");

            if (string.IsNullOrWhiteSpace(parity))
                throw new ArgumentException("Parity is required for Modbus RTU.");

            if (!ValidParities.Contains(parity))
                throw new ArgumentException("Parity must be None, Even, or Odd.");

            if (!slaveId.HasValue || slaveId < 1 || slaveId > 247)
                throw new ArgumentOutOfRangeException(nameof(slaveId), "SlaveId must be between 1 and 247.");
        }

        public async Task<Guid> CreateDeviceAsync(
            CreateDeviceDto request,
            CancellationToken ct = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var name = request.Name?.Trim();
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Device name is required.", nameof(request.Name));

            if (string.IsNullOrWhiteSpace(request.GatewayClientId))
                throw new ArgumentException("Gateway Client is required.",
                                            nameof(request.GatewayClientId));

            const int MaxDevices = 20;
            var currentCount =
                await _db.Devices.CountAsync(d => !d.IsDeleted, ct);

            if (currentCount >= MaxDevices)
                throw new InvalidOperationException(
                    $"Cannot create more than {MaxDevices} devices.");

            var exists =
                await _db.Devices.AsNoTracking()
                    .AnyAsync(d => !d.IsDeleted &&
                                   d.Name.ToLower() == name.ToLower(),
                              ct);

            if (exists)
                throw new InvalidOperationException(
                    $"Device name '{name}' already exists.");

            await using var tx =
                await _db.Database.BeginTransactionAsync(ct);

            var device =
                new Device
                {
                    DeviceId = Guid.NewGuid(),
                    Name = name,
                    Description =
                        string.IsNullOrWhiteSpace(request.Description)
                            ? null
                            : request.Description.Trim(),

                    GatewayId = request.GatewayClientId,
                    Protocol = request.Protocol
                };

            await _db.Devices.AddAsync(device, ct);

            // ---------------- Configuration ----------------
            if (request.Configuration != null)
            {
                var cfgDto = request.Configuration;

                if (string.IsNullOrWhiteSpace(cfgDto.Name) || cfgDto.Name.Length > 100)
                    throw new ArgumentException(
                        "Configuration name must be between 1 and 100 characters.",
                        nameof(cfgDto.Name));

                // -------- Protocol validation --------

                if (request.Protocol == DeviceProtocol.Modbus)
                {
                    if (!cfgDto.ModbusMode.HasValue)
                        throw new ArgumentException("ModbusMode is required for Modbus");

                    if (cfgDto.ModbusMode == ModbusConnectionMode.Tcp)
                    {
                        if (string.IsNullOrWhiteSpace(cfgDto.IpAddress))
                            throw new ArgumentException("IpAddress is required for Modbus TCP");
                        if (!cfgDto.Port.HasValue || cfgDto.Port <= 0 || cfgDto.Port > 65535)
                            throw new ArgumentOutOfRangeException(nameof(cfgDto.Port));
                        if (!cfgDto.SlaveId.HasValue || cfgDto.SlaveId < 0 || cfgDto.SlaveId > 247)
                            throw new ArgumentOutOfRangeException(nameof(cfgDto.SlaveId));
                    }
                    else if (cfgDto.ModbusMode == ModbusConnectionMode.Rtu)
                    {
                        if (string.IsNullOrWhiteSpace(cfgDto.SerialPort))
                            throw new ArgumentException("SerialPort is required for Modbus RTU");
                        if (!ValidSerialPortRegex.IsMatch(cfgDto.SerialPort.Trim()))
                            throw new ArgumentException("Invalid SerialPort format. Use COM1-COM256 or /dev/ttyS0, /dev/ttyUSB0, /dev/ttyACM0, /dev/ttyAMA0.");
                        if (!cfgDto.BaudRate.HasValue)
                            throw new ArgumentException("BaudRate is required for Modbus RTU");
                        if (!cfgDto.SlaveId.HasValue || cfgDto.SlaveId < 0 || cfgDto.SlaveId > 247)
                            throw new ArgumentOutOfRangeException(nameof(cfgDto.SlaveId),
                                "SlaveId is required for Modbus RTU (0-247)");
                    }
                }

                else if (request.Protocol == DeviceProtocol.OpcUa)
                {
                    if (string.IsNullOrWhiteSpace(cfgDto.ConnectionString))
                        throw new ArgumentException(
                            "ConnectionString is required for OPC UA");

                    if (!cfgDto.ConnectionMode.HasValue)
                        throw new ArgumentException(
                            "ConnectionMode is required for OPC UA");

                    if (cfgDto.ConnectionMode == OpcUaConnectionMode.Polling &&
                        !cfgDto.PollIntervalMs.HasValue)
                        throw new ArgumentException(
                            "PollIntervalMs is required for OPC UA Polling");
                }
                else
                {
                    throw new InvalidOperationException("Unsupported protocol");
                }

                var cfg =
                    new DeviceConfiguration
                    {
                        ConfigurationId = Guid.NewGuid(),
                        Name = cfgDto.Name.Trim(),
                        Protocol = request.Protocol,

                        // OPC UA
                        ConnectionString =
                            request.Protocol == DeviceProtocol.OpcUa
                                ? cfgDto.ConnectionString
                                : null,

                        ConnectionMode =
                            request.Protocol == DeviceProtocol.OpcUa
                                ? cfgDto.ConnectionMode
                                : null,

                        // Polling
                        PollIntervalMs =
                            request.Protocol == DeviceProtocol.Modbus
                                ? cfgDto.PollIntervalMs ?? 1000
                                : cfgDto.ConnectionMode == OpcUaConnectionMode.Polling
                                    ? cfgDto.PollIntervalMs
                                    : null,

                        // MODBUS
                        IpAddress =
                            request.Protocol == DeviceProtocol.Modbus
                                ? cfgDto.IpAddress
                                : null,

                        Port =
                            request.Protocol == DeviceProtocol.Modbus
                                ? cfgDto.Port
                                : null,

                        SlaveId =
                            request.Protocol == DeviceProtocol.Modbus
                                ? cfgDto.SlaveId
                                : null,

                        Endian =
                            request.Protocol == DeviceProtocol.Modbus
                                ? cfgDto.Endian
                                : null,

                        ModbusMode =
                            request.Protocol == DeviceProtocol.Modbus
                                ? cfgDto.ModbusMode
                                : null,

                        SerialPort =
                            request.Protocol == DeviceProtocol.Modbus
                                ? cfgDto.SerialPort
                                : null,

                        BaudRate =
                            request.Protocol == DeviceProtocol.Modbus
                                ? cfgDto.BaudRate
                                : null,
                        Parity =
                            request.Protocol == DeviceProtocol.Modbus
                                ? cfgDto.Parity
                                : null
                    };

                await _db.DeviceConfigurations.AddAsync(cfg, ct);
                device.DeviceConfigurationId = cfg.ConfigurationId;
            }

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            _log.LogInformation("Created device {DeviceId}", device.DeviceId);
            return device.DeviceId;
        }


        public async Task UpdateDeviceAsync(Guid deviceId, UpdateDeviceDto dto, DeviceConfigurationDto? configDto = null, CancellationToken ct = default)
        {
            var device = await _db.Devices
                .FirstOrDefaultAsync(d => d.DeviceId == deviceId, ct);

            if (device == null)
                throw new KeyNotFoundException("Device not found");


            // Prevent updates to soft-deleted devices
            if (device.IsDeleted)
                throw new InvalidOperationException("Cannot update a deleted device.");

            // ---------------- Device fields ----------------
            if (dto.Name != null)
            {
                var trimmed = dto.Name.Trim();
                if (trimmed.Length < 3 || trimmed.Length > 100)
                    throw new ArgumentException(
                        "Device name must be between 3 and 100 characters.",
                        nameof(dto.Name));

                var newNameNorm = trimmed.ToLowerInvariant();
                var currentNameNorm = (device.Name ?? string.Empty).ToLowerInvariant();

                if (newNameNorm != currentNameNorm)
                {
                    var exists = await _db.Devices.AsNoTracking().AnyAsync(
                        d => d.DeviceId != deviceId && !d.IsDeleted &&
                             d.Name.ToLower() == newNameNorm,
                        ct);

                    if (exists)
                        throw new ArgumentException(
                            "A device with the same name already exists.");
                }

                device.Name = trimmed;
            }

            if (dto.Description != null)
            {
                var trimmedDesc = dto.Description.Trim();
                if (trimmedDesc.Length > 255)
                    throw new ArgumentException(
                        "Description cannot exceed 255 characters.",
                        nameof(dto.Description));
                device.Description = trimmedDesc;
            }

            if (dto.Protocol.HasValue)
            {
                //prevent protocol change when configuration exists
                if (device.DeviceConfigurationId.HasValue)
                    throw new InvalidOperationException(
                        "Cannot change protocol when configuration already exists.");

                device.Protocol = dto.Protocol.Value;
            }

            // ---------------- Configuration ----------------
            if (configDto != null)
            {

                var isMapped = await _assetDb.Signals.AsNoTracking().AnyAsync(s => s.DeviceId == deviceId, ct);

                if (isMapped && device.Protocol != configDto.Protocol)
                {
                    throw new InvalidOperationException(
                        "Cannot change protocol when device is mapped to an asset.");
                }

                if (isMapped)
                {
                    _log.LogWarning(
                        "Updating configuration for mapped device {DeviceId}. This may affect telemetry data.",
                        deviceId);
                }
                //  Sync device protocol with configuration protocol
                if (configDto.Protocol == DeviceProtocol.Modbus)
                {
                    if (!configDto.ModbusMode.HasValue)
                        throw new ArgumentException("ModbusMode is required for Modbus.");

                    if (configDto.ModbusMode == ModbusConnectionMode.Tcp)
                    {
                        if (string.IsNullOrWhiteSpace(configDto.IpAddress))
                            throw new ArgumentException("IpAddress is required for Modbus TCP.");
                        if (!configDto.Port.HasValue || configDto.Port < 1 || configDto.Port > 65535)
                            throw new ArgumentOutOfRangeException(nameof(configDto.Port), "Port must be between 1 and 65535.");
                        if (!configDto.SlaveId.HasValue || configDto.SlaveId < 0 || configDto.SlaveId > 247)
                            throw new ArgumentOutOfRangeException(nameof(configDto.SlaveId), "SlaveId must be between 0 and 247.");
                    }
                    else if (configDto.ModbusMode == ModbusConnectionMode.Rtu)
                    {
                        ValidateModbusRtu(configDto.SerialPort, configDto.BaudRate, configDto.Parity, configDto.SlaveId);
                    }
                }
                else if (configDto.Protocol == DeviceProtocol.OpcUa)
                {
                    if (string.IsNullOrWhiteSpace(configDto.ConnectionString))
                        throw new ArgumentException("ConnectionString is required for OPC UA.");
                    if (!configDto.ConnectionMode.HasValue)
                        throw new ArgumentException("ConnectionMode is required for OPC UA.");
                    if (configDto.ConnectionMode == OpcUaConnectionMode.Polling && !configDto.PollIntervalMs.HasValue)
                        throw new ArgumentException("PollIntervalMs is required for OPC UA Polling.");
                }
                else
                {
                    throw new InvalidOperationException("Unsupported protocol.");
                }

                // Sync device protocol with configuration protocol
                device.Protocol = configDto.Protocol;



                // Helper to apply protocol-aware fields
                void ApplyConfig(DeviceConfiguration cfg)
                {
                    cfg.Name = configDto.Name.Trim();
                    cfg.Protocol = configDto.Protocol;

                    // Clear all protocol-specific fields first
                    cfg.ConnectionString = null;
                    cfg.ConnectionMode = null;
                    cfg.PollIntervalMs = null;
                    cfg.IpAddress = null;
                    cfg.Port = null;
                    cfg.SlaveId = null;
                    cfg.Endian = null;
                    cfg.SerialPort = null;
                    cfg.BaudRate = null;
                    cfg.Parity = null;
                    cfg.ModbusMode = null;


                    // OPC UA
                    if (configDto.Protocol == DeviceProtocol.OpcUa)
                    {
                        cfg.ConnectionString = configDto.ConnectionString;
                        cfg.ConnectionMode = configDto.ConnectionMode;
                        cfg.PollIntervalMs = configDto.ConnectionMode == OpcUaConnectionMode.Polling
                            ? configDto.PollIntervalMs
                            : null;
                    }
                    // MODBUS
                    else if (configDto.Protocol == DeviceProtocol.Modbus)
                    {
                        cfg.IpAddress = configDto.IpAddress;
                        cfg.Port = configDto.Port;
                        cfg.SlaveId = configDto.SlaveId;
                        cfg.Endian = configDto.Endian;
                        cfg.PollIntervalMs = configDto.PollIntervalMs ?? 1000;

                        cfg.ModbusMode = configDto.ModbusMode;
                        cfg.SerialPort = configDto.SerialPort;
                        cfg.BaudRate = configDto.BaudRate;
                        cfg.Parity = configDto.Parity;
                    }
                }

                DeviceConfiguration? targetCfg;

                if (device.DeviceConfigurationId is Guid cfgId)
                {
                    var otherUses = await _db.Devices.AsNoTracking().AnyAsync(
                        d => d.DeviceId != deviceId && d.DeviceConfigurationId == cfgId, ct);

                    if (!otherUses)
                    {
                        // FIX: Use FirstOrDefaultAsync for tracking
                        targetCfg = await _db.DeviceConfigurations
                            .FirstOrDefaultAsync(c => c.ConfigurationId == cfgId, ct);

                        if (targetCfg == null)
                        {
                            targetCfg = new DeviceConfiguration { ConfigurationId = Guid.NewGuid() };
                            await _db.DeviceConfigurations.AddAsync(targetCfg, ct);
                            device.DeviceConfigurationId = targetCfg.ConfigurationId;
                        }
                        else
                        {
                            // Mark as modified
                            _db.Entry(targetCfg).State = EntityState.Modified;
                        }
                    }
                    else
                    {
                        // Create new configuration if shared by other devices
                        targetCfg = new DeviceConfiguration { ConfigurationId = Guid.NewGuid() };
                        await _db.DeviceConfigurations.AddAsync(targetCfg, ct);
                        device.DeviceConfigurationId = targetCfg.ConfigurationId;
                    }
                }
                else
                {
                    targetCfg = new DeviceConfiguration { ConfigurationId = Guid.NewGuid() };
                    await _db.DeviceConfigurations.AddAsync(targetCfg, ct);
                    device.DeviceConfigurationId = targetCfg.ConfigurationId;
                }

                ApplyConfig(targetCfg);

                _log.LogInformation(
                    "Attached/updated configuration {CfgId} and set device {DeviceId} protocol to {Protocol}",
                    targetCfg.ConfigurationId, deviceId, configDto.Protocol);
            }

            // Mark device as modified
            _db.Entry(device).State = EntityState.Modified;

            // Save all changes
            await _db.SaveChangesAsync(ct);
        }

        public async Task<(List<Device> Devices, int TotalCount)> GetAllDevicesAsync(int pageNumber, int pageSize, string? searchTerm, CancellationToken ct = default)
        {
            // Start query
            var query = _db.Devices.Where(d => !d.IsDeleted)
                            .Include(d => d.DeviceConfiguration)
                            .AsNoTracking();

            // Apply search
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                searchTerm = searchTerm.ToLower();
                query =
                    query.Where(d => d.Name.ToLower().Contains(searchTerm) ||
                                     (d.Description != null &&
                                      d.Description.ToLower().Contains(searchTerm)));
            }

            // Get total count for pagination metadata
            var totalCount = await query.CountAsync(ct);

            // Apply pagination
            var devices = await query.Skip((pageNumber - 1) * pageSize)
                              .Take(pageSize)
                              .ToListAsync(ct);

            return (devices, totalCount);
        }

        public async Task DeleteDeviceAsync(Guid deviceId, CancellationToken ct = default)
        {
            var device = await _db.Devices.FindAsync(new object[] { deviceId }, ct);
            if (device == null)
                throw new KeyNotFoundException("Device not found");

            if (device.IsDeleted)
            {
                _log.LogWarning("Device {DeviceId} is already marked as deleted",
                                deviceId);
                return;
            }

            var isMapped = await _assetDb.Signals.AsNoTracking().AnyAsync(
                s => s.DeviceId == deviceId, ct);
            if (isMapped)
                throw new InvalidOperationException(
                    "Cannot delete device because it is mapped to asset");

            // Optional: If you want to prevent deletion if config is used elsewhere
            if (device.DeviceConfigurationId is Guid cfgId)
            {
                var otherUses = await _db.Devices.AsNoTracking().AnyAsync(
                    d => d.DeviceId != deviceId && d.DeviceConfigurationId == cfgId &&
                         !d.IsDeleted,
                    ct);

                if (otherUses)
                    throw new InvalidOperationException(
                        "DeviceConfiguration is referenced by other devices and cannot be deleted. Detach it first or remove other references.");
            }

            // Soft delete instead of physical delete
            device.IsDeleted = true;

            // Optionally update timestamp or audit fields here if needed
            // device.DeletedAt = DateTime.UtcNow;

            _db.Devices.Update(device);
            await _db.SaveChangesAsync(ct);

            _log.LogInformation("Soft deleted device {DeviceId}", deviceId);
        }
        public Task<Device?> GetDeviceAsync(Guid deviceId, CancellationToken ct = default) =>
            _db.Devices.Include(d => d.DeviceConfiguration)
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.DeviceId == deviceId && !d.IsDeleted,
                                     ct);
        public async Task<bool> IsDeviceMappedAsync(Guid deviceId, CancellationToken ct = default)
        {
            return await _assetDb.Signals.AsNoTracking()
                .AnyAsync(s => s.DeviceId == deviceId, ct);
        }
        public async Task<List<Device>> GetDeletedDevicesAsync(CancellationToken ct = default)
        {
            return await _db.Devices.Where(d => d.IsDeleted)
                .Include(d => d.DeviceConfiguration)
                .AsNoTracking()
                .ToListAsync(ct);
        }

        // --- Get one soft-deleted device
        public Task<Device?> GetDeletedDeviceAsync(Guid deviceId, CancellationToken ct = default) =>
            _db.Devices.Where(d => d.IsDeleted)
                .Include(d => d.DeviceConfiguration)
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.DeviceId == deviceId, ct);

        // --- Restore soft-deleted device
        public async Task RestoreDeviceAsync(Guid deviceId, CancellationToken ct = default)
        {
            var device = await _db.Devices.FindAsync(new object[] { deviceId }, ct);
            if (device == null)
                throw new KeyNotFoundException("Device not found");
            if (!device.IsDeleted)
            {
                _log.LogWarning(
                    "Attempted to restore device {DeviceId} but it is not deleted",
                    deviceId);
                return;  // or throw if you prefer
            }

            // If there's any business rule preventing restore (example: config
            // removed) handle here.
            device.IsDeleted = false;
            // Optionally update timestamps: device.UpdatedAt = DateTime.UtcNow;

            _db.Devices.Update(device);
            await _db.SaveChangesAsync(ct);
            _log.LogInformation("Restored device {DeviceId}", deviceId);
        }

        // --- Permanently delete (hard delete) a device and related resources (if
        // desired)
        public async Task PermanentlyDeleteDeviceAsync(Guid deviceId, CancellationToken ct = default)
        {
            var device = await _db.Devices.FindAsync(new object[] { deviceId }, ct);
            if (device == null)
                throw new KeyNotFoundException("Device not found");

            // If you want only-allow-hard-delete-for-already-soft-deleted:
            // if (!device.IsDeleted) throw new InvalidOperationException("Device must
            // be soft-deleted first.");

            // Remove related child rows if cascade isn't configured (uncomment if
            // needed) var ports = _db.DeviceSlaves.Where(p => p.DeviceId ==
            // deviceId); _db.DeviceSlaves.RemoveRange(ports); var portSets =
            // _db.DeviceSlaveSets.Where(ps => ps.DeviceId == deviceId);
            // _db.DeviceSlaveSets.RemoveRange(portSets);

            if (device.DeviceConfigurationId is Guid cfgId)
            {
                // ensure no other non-deleted devices reference the same config
                var otherUses = await _db.Devices.AsNoTracking().AnyAsync(
                    d => d.DeviceId != deviceId && d.DeviceConfigurationId == cfgId &&
                         !d.IsDeleted,
                    ct);

                if (otherUses)
                {
                    // detach only device, keep config
                    _db.Devices.Remove(device);
                    await _db.SaveChangesAsync(ct);
                    _log.LogInformation(
                        "Hard-deleted device {DeviceId} but kept shared configuration {CfgId}",
                        deviceId, cfgId);
                    return;
                }

                // safe to delete the config too
                var cfg = await _db.DeviceConfigurations.FindAsync(
                    new object[] { cfgId }, ct);
                if (cfg != null)
                    _db.DeviceConfigurations.Remove(cfg);
            }

            _db.Devices.Remove(device);
            await _db.SaveChangesAsync(ct);
            _log.LogInformation(
                "Hard-deleted device {DeviceId} and its configuration if not shared",
                deviceId);
        }

        public async Task<Guid> AddConfigurationAsync(Guid deviceId, DeviceConfigurationDto dto, CancellationToken ct = default)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            //  Use FirstOrDefaultAsync instead of FindAsync for better tracking
            var device = await _db.Devices
                .FirstOrDefaultAsync(d => d.DeviceId == deviceId, ct);

            if (device == null)
                throw new KeyNotFoundException("Device not found");
            // Check if device is mapped
            var isMapped = await _assetDb.Signals.AsNoTracking()
                .AnyAsync(s => s.DeviceId == deviceId, ct);


            if (isMapped && device.Protocol != dto.Protocol)
            {
                throw new InvalidOperationException(
                    "Cannot change protocol when device is mapped to an asset.");
            }


            if (isMapped)
            {
                _log.LogWarning(
                    "Adding/updating configuration for mapped device {DeviceId}. This may affect telemetry data.",
                    deviceId);
            }

            if (device.IsDeleted)
                throw new InvalidOperationException(
                    "Cannot attach configuration to a deleted device.");

            if (string.IsNullOrWhiteSpace(dto.Name) || dto.Name.Length > 100)
                throw new ArgumentException(
                    "Configuration name must be between 1 and 100 characters.",
                    nameof(dto.Name));

            // -------- Protocol validation --------

            if (dto.Protocol == DeviceProtocol.Modbus)
            {
                if (!dto.ModbusMode.HasValue)
                    throw new ArgumentException("ModbusMode is required for Modbus");

                if (dto.ModbusMode == ModbusConnectionMode.Tcp)
                {
                    if (string.IsNullOrWhiteSpace(dto.IpAddress))
                        throw new ArgumentException("IpAddress is required for Modbus TCP");
                    if (!dto.Port.HasValue || dto.Port <= 0 || dto.Port > 65535)
                        throw new ArgumentOutOfRangeException(nameof(dto.Port));
                    if (!dto.SlaveId.HasValue || dto.SlaveId < 0 || dto.SlaveId > 247)
                        throw new ArgumentOutOfRangeException(nameof(dto.SlaveId));
                }
                else if (dto.ModbusMode == ModbusConnectionMode.Rtu)
                {
                    if (string.IsNullOrWhiteSpace(dto.SerialPort))
                        throw new ArgumentException("SerialPort is required for Modbus RTU");
                    if (!ValidSerialPortRegex.IsMatch(dto.SerialPort.Trim()))
                        throw new ArgumentException("Invalid SerialPort format. Use COM1-COM256 or /dev/ttyS0, /dev/ttyUSB0, /dev/ttyACM0, /dev/ttyAMA0.");
                    if (!dto.BaudRate.HasValue)
                        throw new ArgumentException("BaudRate is required for Modbus RTU");
                    if (!dto.SlaveId.HasValue || dto.SlaveId < 0 || dto.SlaveId > 247)
                        throw new ArgumentOutOfRangeException(nameof(dto.SlaveId));
                }
            }
            else if (dto.Protocol == DeviceProtocol.OpcUa)
            {
                if (string.IsNullOrWhiteSpace(dto.ConnectionString))
                    throw new ArgumentException("ConnectionString is required for OPC UA");

                if (!dto.ConnectionMode.HasValue)
                    throw new ArgumentException("ConnectionMode is required for OPC UA");

                if (dto.ConnectionMode == OpcUaConnectionMode.Polling &&
                    !dto.PollIntervalMs.HasValue)
                    throw new ArgumentException(
                        "PollIntervalMs is required for OPC UA Polling");
            }
            else
            {
                throw new InvalidOperationException("Unsupported protocol");
            }

            var cfg = new DeviceConfiguration
            {
                ConfigurationId = Guid.NewGuid(),
                Name = dto.Name.Trim(),
                Protocol = dto.Protocol,

                // OPC UA
                ConnectionString = dto.Protocol == DeviceProtocol.OpcUa
                    ? dto.ConnectionString
                    : null,

                ConnectionMode = dto.Protocol == DeviceProtocol.OpcUa
                    ? dto.ConnectionMode
                    : null,

                // Polling
                PollIntervalMs = dto.Protocol == DeviceProtocol.Modbus
                    ? dto.PollIntervalMs ?? 1000
                    : dto.ConnectionMode == OpcUaConnectionMode.Polling
                        ? dto.PollIntervalMs
                        : null,

                // MODBUS
                IpAddress = dto.Protocol == DeviceProtocol.Modbus ? dto.IpAddress : null,
                Port = dto.Protocol == DeviceProtocol.Modbus ? dto.Port : null,
                SlaveId = dto.Protocol == DeviceProtocol.Modbus ? dto.SlaveId : null,
                Endian = dto.Protocol == DeviceProtocol.Modbus ? dto.Endian : null,
                ModbusMode = dto.Protocol == DeviceProtocol.Modbus ? dto.ModbusMode : null,
                SerialPort = dto.Protocol == DeviceProtocol.Modbus ? dto.SerialPort : null,
                BaudRate = dto.Protocol == DeviceProtocol.Modbus ? dto.BaudRate : null,
                Parity = dto.Protocol == DeviceProtocol.Modbus ? dto.Parity : null
            };

            // Add configuration first
            await _db.DeviceConfigurations.AddAsync(cfg, ct);

            //   FIX: Update protocol FIRST, then the configuration ID
            device.Protocol = dto.Protocol;
            device.DeviceConfigurationId = cfg.ConfigurationId;

            //   FIX: Explicitly mark the entire entity as modified
            _db.Entry(device).State = EntityState.Modified;

            // Save all changes
            await _db.SaveChangesAsync(ct);

            _log.LogInformation(
                "Added configuration {CfgId} to device {DeviceId} and updated protocol to {Protocol}",
                cfg.ConfigurationId,
                deviceId,
                dto.Protocol);

            return cfg.ConfigurationId;
        }


        public async Task<Guid> AddPortAsync(Guid deviceId, AddPortDto dto, CancellationToken ct = default)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            if (dto.Registers == null || !dto.Registers.Any())
                throw new InvalidOperationException("At least one register is required.");

            if (dto.Registers.Count > 5)
                throw new InvalidOperationException("A slave can have a maximum of 5 registers.");

            var device = await _db.Devices.FindAsync(new object[] { deviceId }, ct);
            if (device == null || device.IsDeleted)
                throw new KeyNotFoundException("Device not found");

            var slaveCount = await _db.DeviceSlaves.CountAsync(s => s.DeviceId == deviceId, ct);
            if (slaveCount >= 2)
                throw new InvalidOperationException("A device can have a maximum of 2 slaves.");

            var exists = await _db.DeviceSlaves.AnyAsync(
                p => p.DeviceId == deviceId && p.slaveIndex == dto.slaveIndex, ct);

            if (exists)
                throw new InvalidOperationException($"Port with index {dto.slaveIndex} already exists");

            // VALIDATIONS 


            foreach (var reg in dto.Registers)
            {
                if (string.IsNullOrWhiteSpace(reg.SignalName))
                    throw new InvalidOperationException("SignalName is required.");

                var regex = new Regex(@"^[a-zA-Z0-9_]{3,50}$");

                if (!regex.IsMatch(reg.SignalName))
                {
                    throw new Exception("Signal name must contain only letters, numbers, or underscore and be 3–50 characters long.");
                }

                if (reg.SignalName.Length > 100)
                    throw new InvalidOperationException($"SignalName too long: {reg.SignalName}");

                if (reg.RegisterAddress < 0 || reg.RegisterAddress > 65535)
                    throw new InvalidOperationException($"Invalid register address: {reg.RegisterAddress}");
            }

            // Prevent duplicate SignalNames inside same slave
            var duplicateSignals = dto.Registers
                .GroupBy(r => r.SignalName.Trim().ToLower())
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToList();

            if (duplicateSignals.Any())
                throw new InvalidOperationException(
                    $"Duplicate signals: {string.Join(", ", duplicateSignals)}");

            // Prevent duplicate register addresses
            var duplicateAddresses = dto.Registers
                .GroupBy(r => r.RegisterAddress)
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToList();

            if (duplicateAddresses.Any())
                throw new InvalidOperationException(
                    $"Duplicate register addresses: {string.Join(", ", duplicateAddresses)}");



            var port = new DeviceSlave
            {
                DeviceId = deviceId,
                slaveIndex = dto.slaveIndex,
                IsHealthy = dto.IsHealthy,

                Registers = dto.Registers.Select(r => new Register
                {
                    RegisterAddress = r.RegisterAddress,
                    RegisterLength = r.RegisterLength,
                    DataType = r.DataType,


                    SignalName = r.SignalName.Trim(),

                    Scale = r.Scale,
                    Unit = r.Unit,
                    ByteOrder = r.ByteOrder,
                    WordSwap = r.WordSwap,
                    IsHealthy = r.IsHealthy
                }).ToList()
            };

            await _db.DeviceSlaves.AddAsync(port, ct);
            await _db.SaveChangesAsync(ct);

            return port.deviceSlaveId;
        }

        public async Task UpdatePortAsync(Guid deviceId, int slaveIndex, AddPortDto dto, CancellationToken ct = default)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            if (dto.Registers == null || !dto.Registers.Any())
                throw new InvalidOperationException("At least one register is required.");

            if (dto.Registers.Count > 5)
                throw new InvalidOperationException("A slave can have a maximum of 5 registers.");

            // Validate signal names
            foreach (var reg in dto.Registers)
            {
                if (string.IsNullOrWhiteSpace(reg.SignalName))
                    throw new InvalidOperationException("SignalName is required.");

                if (reg.SignalName.Length > 100)
                    throw new InvalidOperationException($"SignalName too long: {reg.SignalName}");
            }

            // Prevent duplicate signals in request
            var duplicateSignals = dto.Registers
                .GroupBy(r => r.SignalName.Trim().ToLower())
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToList();

            if (duplicateSignals.Any())
                throw new InvalidOperationException(
                    $"Duplicate signals: {string.Join(", ", duplicateSignals)}");

            // 1 Load port
            var portNoTrack = await _db.DeviceSlaves
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    p => p.DeviceId == deviceId && p.slaveIndex == slaveIndex, ct);

            if (portNoTrack == null)
                throw new KeyNotFoundException(
                    $"Port {slaveIndex} not found for device {deviceId}.");

            // 2️ Fetch signals already used in asset system
            var usedSignalNames = await _assetDb.Signals
                .AsNoTracking()
                .Where(s => s.DeviceId == deviceId)
                .Select(s => s.SignalName.ToLower())
                .Distinct()
                .ToListAsync(ct);

            // Only allow registers not already used by assets
            var registersToAdd = dto.Registers
                .Where(r => !usedSignalNames.Contains(r.SignalName.ToLower()))
                .ToList();

            await using var tx = await _db.Database.BeginTransactionAsync(ct);
            try
            {
                // 3️ Delete existing registers that are NOT used in Signals table
                var existingRegistersToDelete = _db.Registers.Where(r =>
                    r.deviceSlaveId == portNoTrack.deviceSlaveId &&
                    !usedSignalNames.Contains(r.SignalName.ToLower()));

                _db.Registers.RemoveRange(existingRegistersToDelete);
                await _db.SaveChangesAsync(ct);

                // 4️ Reload tracked port
                var port = await _db.DeviceSlaves.FirstOrDefaultAsync(
                    p => p.DeviceId == deviceId && p.slaveIndex == slaveIndex, ct);

                if (port == null)
                {
                    await tx.RollbackAsync(ct);
                    throw new InvalidOperationException("Port disappeared during update.");
                }

                port.IsHealthy = dto.IsHealthy;

                // 5️ Add new registers
                var newRegisters = registersToAdd.Select(r => new Register
                {
                    RegisterAddress = r.RegisterAddress,
                    RegisterLength = r.RegisterLength,
                    DataType = r.DataType,
                    SignalName = r.SignalName.Trim(),
                    Scale = r.Scale,
                    Unit = r.Unit,
                    ByteOrder = r.ByteOrder,
                    WordSwap = r.WordSwap,
                    IsHealthy = r.IsHealthy,
                    deviceSlaveId = port.deviceSlaveId
                }).ToList();

                if (newRegisters.Any())
                    await _db.Registers.AddRangeAsync(newRegisters, ct);

                await _db.SaveChangesAsync(ct);
                await tx.CommitAsync(ct);
            }
            catch (DbUpdateConcurrencyException ex)
            {
                _log.LogError(ex,
                    "Concurrency error updating port {DeviceId}/{slaveIndex}",
                    deviceId, slaveIndex);

                await tx.RollbackAsync(ct);
                throw new InvalidOperationException("Concurrency error while updating port", ex);
            }
            catch (Exception ex)
            {
                _log.LogError(ex,
                    "Error updating port {DeviceId}/{slaveIndex}",
                    deviceId, slaveIndex);

                try { await tx.RollbackAsync(ct); } catch { }
                throw;
            }
        }

        // optional getter
        public async Task<DeviceSlave?> GetPortAsync(Guid deviceId, int slaveIndex, CancellationToken ct = default)
        {
            return await _db.DeviceSlaves.Include(p => p.Registers)
                .FirstOrDefaultAsync(
                    p => p.DeviceId == deviceId && p.slaveIndex == slaveIndex, ct);
        }

        public async Task<List<MatchedDeviceDto>> GetUnmappedDevicesAsync(CancellationToken ct)
        {
            // Get all mapped RegisterIds and OpcUaNodeIds from Signals table
            var mappedRegisterIds = await _assetDb.Signals
                .AsNoTracking()
                .Where(s => s.RegisterId.HasValue)
                .Select(s => s.RegisterId!.Value)
                .ToHashSetAsync(ct);

            var mappedOpcNodeIds = await _assetDb.Signals
                .AsNoTracking()
                .Where(s => s.OpcUaNodeId.HasValue)
                .Select(s => s.OpcUaNodeId!.Value)
                .ToHashSetAsync(ct);

            // Get all Modbus devices that have at least one slave with registers
            var modbusDevices = await _db.Devices
                .AsNoTracking()
                .Where(d => !d.IsDeleted &&
                    d.Protocol == DeviceProtocol.Modbus &&
                    d.DeviceSlave.Any(ds => ds.Registers.Any()))
                .Include(d => d.DeviceSlave)
                    .ThenInclude(ds => ds.Registers)
                .ToListAsync(ct);

            // Get all OPC UA devices that have at least one node
            var opcUaDevices = await _db.Devices
                .AsNoTracking()
                .Where(d => !d.IsDeleted &&
                    d.Protocol == DeviceProtocol.OpcUa &&
                    d.OpcUaNodes.Any())
                .Include(d => d.OpcUaNodes)
                .ToListAsync(ct);

            var result = new List<MatchedDeviceDto>();

            // ── MODBUS ──────────────────────────────────────────────────────
            foreach (var device in modbusDevices)
            {
                var slaves = new List<MatchedSlaveDto>();

                foreach (var ds in device.DeviceSlave)
                {
                    var unmappedRegs = (ds.Registers ?? new List<Register>())
                        .Where(r => !mappedRegisterIds.Contains(r.RegisterId))
                        .Select(r => new MatchedRegisterDto
                        {
                            RegisterId = r.RegisterId,
                            RegisterAddress = r.RegisterAddress,
                            RegisterLength = r.RegisterLength,
                            DataType = r.DataType,
                            SignalName = r.SignalName,
                            IsHealthy = r.IsHealthy,
                            Scale = r.Scale,
                            SignalUnit = r.Unit ?? string.Empty,
                            ByteOrder = r.ByteOrder,
                            WordSwap = r.WordSwap
                        })
                        .ToList();

                    if (unmappedRegs.Any())
                    {
                        slaves.Add(new MatchedSlaveDto
                        {
                            DeviceSlaveId = ds.deviceSlaveId,
                            SlaveIndex = ds.slaveIndex,
                            IsHealthy = ds.IsHealthy,
                            MatchedRegisters = unmappedRegs
                        });
                    }
                }

                if (slaves.Any())
                {
                    result.Add(new MatchedDeviceDto
                    {
                        DeviceId = device.DeviceId,
                        Name = device.Name,
                        Description = device.Description,
                        Protocol = device.Protocol,
                        MatchedSlaves = slaves,
                        MatchedNodes = null
                    });
                }
            }

            // ── OPC UA ──────────────────────────────────────────────────────
            foreach (var device in opcUaDevices)
            {
                var unmappedNodes = device.OpcUaNodes
                    .Where(n => !mappedOpcNodeIds.Contains(n.OpcUaNodeId))
                    .Select(n => new MatchedNodeDto
                    {
                        OpcUaNodeId = n.OpcUaNodeId,
                        NodeId = n.NodeId,
                        SignalName = n.SignalName,
                        SignalUnit = n.Unit ?? string.Empty,
                        DataType = n.DataType,
                        ScalingFactor = n.ScalingFactor
                    })
                    .ToList();

                if (unmappedNodes.Any())
                {
                    result.Add(new MatchedDeviceDto
                    {
                        DeviceId = device.DeviceId,
                        Name = device.Name,
                        Description = device.Description,
                        Protocol = device.Protocol,
                        MatchedSlaves = null,
                        MatchedNodes = unmappedNodes
                    });
                }
            }

            return result;
        }


        public async Task<List<DeviceSlave>> GetPortsByDeviceAsync(Guid deviceId, CancellationToken ct)
        {
            if (deviceId == Guid.Empty)
                throw new ArgumentException("Device ID cannot be empty.",
                                            nameof(deviceId));

            return await _db.DeviceSlaves.Include(p => p.Registers)
                .Where(p => p.DeviceId == deviceId)
                .ToListAsync(ct);
        }

        // ============================================
        // OPC UA NODE MANAGEMENT
        // ============================================



        public async Task<List<OpcUaNode>> GetOpcUaNodesByDeviceAsync(
            Guid deviceId,
            CancellationToken ct = default)
        {
            return await _db.OpcUaNodes
                .AsNoTracking()
                .Where(n => n.DeviceId == deviceId)
                .OrderBy(n => n.SignalName)
                .ToListAsync(ct);
        }

        public async Task<OpcUaNode?> GetOpcUaNodeAsync(
            Guid nodeId,
            CancellationToken ct = default)
        {
            return await _db.OpcUaNodes
                .AsNoTracking()
                .FirstOrDefaultAsync(n => n.OpcUaNodeId == nodeId, ct);
        }

        public async Task<Guid> AddOpcUaNodeAsync(Guid deviceId, CreateOpcUaNodeRequest request, CancellationToken ct = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.SignalName))
                throw new InvalidOperationException("SignalName is required.");

            var device = await _db.Devices
                .FirstOrDefaultAsync(d => d.DeviceId == deviceId && !d.IsDeleted, ct);

            if (device == null)
                throw new KeyNotFoundException("Device not found");

            if (device.Protocol != DeviceProtocol.OpcUa)
                throw new InvalidOperationException("Device protocol must be OPC UA to add OPC UA nodes");

            // Prevent duplicate NodeId
            var exists = await _db.OpcUaNodes
                .AnyAsync(n => n.DeviceId == deviceId && n.NodeId == request.NodeId, ct);

            if (exists)
                throw new InvalidOperationException(
                    $"OPC UA node with NodeId '{request.NodeId}' already exists for this device");

            // Prevent duplicate SignalName per device (recommended)
            var duplicateSignal = await _db.OpcUaNodes
                .AnyAsync(n => n.DeviceId == deviceId &&
                               n.SignalName.ToLower() == request.SignalName.ToLower(), ct);

            if (duplicateSignal)
                throw new InvalidOperationException(
                    $"Signal '{request.SignalName}' already exists for this device");

            var node = new OpcUaNode
            {
                OpcUaNodeId = Guid.NewGuid(),
                DeviceId = deviceId,
                NodeId = request.NodeId,
                SignalName = request.SignalName.Trim(),
                DataType = request.DataType,
                Unit = request.Unit,
                ScalingFactor = request.ScalingFactor,
                CreatedAt = DateTime.UtcNow
            };

            await _db.OpcUaNodes.AddAsync(node, ct);
            await _db.SaveChangesAsync(ct);

            _log.LogInformation("Created OPC UA node {NodeId} for device {DeviceId}",
                node.OpcUaNodeId, deviceId);

            return node.OpcUaNodeId;
        }

        public async Task UpdateOpcUaNodeAsync(
            Guid nodeId,
            CreateOpcUaNodeRequest request,
            CancellationToken ct = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            if (string.IsNullOrWhiteSpace(request.SignalName))
                throw new InvalidOperationException("SignalName is required.");

            var node = await _db.OpcUaNodes.FindAsync(new object[] { nodeId }, ct);
            if (node == null)
                throw new KeyNotFoundException("OPC UA node not found");

            // Check if signal is already used in asset system
            var isUsedInSignals = await _assetDb.Signals
                .AsNoTracking()
                .AnyAsync(s =>
                    s.DeviceId == node.DeviceId &&
                    s.SignalName.ToLower() == node.SignalName.ToLower(),
                    ct);

            if (isUsedInSignals &&
                !string.Equals(node.SignalName, request.SignalName,
                               StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Cannot rename OPC UA node because it is used by an asset");
            }

            //  Prevent duplicate NodeId (excluding current node)
            var duplicateNodeId = await _db.OpcUaNodes
                .AnyAsync(n =>
                    n.DeviceId == node.DeviceId &&
                    n.NodeId == request.NodeId &&
                    n.OpcUaNodeId != nodeId,
                    ct);

            if (duplicateNodeId)
                throw new InvalidOperationException(
                    $"Another OPC UA node with NodeId '{request.NodeId}' already exists for this device");

            //  Prevent duplicate SignalName per device
            var duplicateSignal = await _db.OpcUaNodes
                .AnyAsync(n =>
                    n.DeviceId == node.DeviceId &&
                    n.SignalName.ToLower() == request.SignalName.ToLower() &&
                    n.OpcUaNodeId != nodeId,
                    ct);

            if (duplicateSignal)
                throw new InvalidOperationException(
                    $"Signal '{request.SignalName}' already exists for this device");

            //  Apply updates
            node.NodeId = request.NodeId;
            node.SignalName = request.SignalName.Trim();
            node.DataType = request.DataType;
            node.Unit = request.Unit;
            node.ScalingFactor = request.ScalingFactor;

            // No more SignalTypeId usage

            await _db.SaveChangesAsync(ct);

            _log.LogInformation("Updated OPC UA node {NodeId}", nodeId);
        }

        public async Task DeleteOpcUaNodeAsync(Guid nodeId, CancellationToken ct = default)
        {
            var node = await _db.OpcUaNodes.FindAsync(new object[] { nodeId }, ct);
            if (node == null)
                throw new KeyNotFoundException("OPC UA node not found");

            // Check if signal is already used by assets (Signals table)
            var isUsedInSignals = await _assetDb.Signals
                .AsNoTracking()
                .AnyAsync(s =>
                    s.DeviceId == node.DeviceId &&
                    s.SignalName.ToLower() == node.SignalName.ToLower(),
                    ct);

            if (isUsedInSignals)
                throw new InvalidOperationException(
                    $"Cannot delete OPC UA node '{node.SignalName}' because it is used by an asset");

            _db.OpcUaNodes.Remove(node);
            await _db.SaveChangesAsync(ct);

            _log.LogInformation("Deleted OPC UA node {NodeId}", nodeId);
        }

        public async Task<BulkCreateDeviceResultDto> CreateDevicesBulkAsync(BulkCreateDeviceDto request, CancellationToken ct = default)
        {
            if (request == null || request.Devices.Count == 0)
                throw new ArgumentException("No devices provided.");

            var result = new BulkCreateDeviceResultDto();

            // Count existing active devices
            var existingCount = await _db.Devices.CountAsync(d => !d.IsDeleted, ct);
            if (existingCount + request.Devices.Count > 20)
            {
                result.Errors.Add(
                    $"Cannot create {request.Devices.Count} devices. Total devices after creation would be {existingCount + request.Devices.Count}, but maximum allowed is 20.");
                return result;
            }

            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            foreach (var dto in request.Devices)
            {
                try
                {
                    var name = dto.Name?.Trim();
                    if (string.IsNullOrWhiteSpace(name))
                        throw new ArgumentException("Device name is required.");

                    // ONLY ADDITION: protocol validation
                    if (!Enum.IsDefined(typeof(DeviceProtocol), dto.Protocol))
                        throw new ArgumentException("Invalid device protocol.");


                    var exists = await _db.Devices.AsNoTracking().AnyAsync(
                        d => !d.IsDeleted && d.Name.ToLower() == name.ToLower(), ct);

                    if (exists)
                        throw new InvalidOperationException(
                            $"Device name '{name}' already exists.");

                    var device = new Device
                    {
                        DeviceId = Guid.NewGuid(),
                        Name = name,
                        Description = string.IsNullOrWhiteSpace(dto.Description)
                            ? null
                            : dto.Description.Trim(),

                        // ONLY ADDITION: assign protocol
                        Protocol = dto.Protocol
                    };

                    // Configuration (new explicit fields logic)
                    if (dto.Configuration != null)
                    {
                        var c = dto.Configuration;

                        if (string.IsNullOrWhiteSpace(c.Name) || c.Name.Length > 100)
                            throw new ArgumentException(
                                "Configuration name must be between 1 and 100 characters.");

                        // -------- Protocol validation -------
                        if (c.Protocol == DeviceProtocol.Modbus)
                        {
                            if (!c.ModbusMode.HasValue)
                                throw new ArgumentException("ModbusMode is required for Modbus");

                            if (c.ModbusMode == ModbusConnectionMode.Tcp)
                            {
                                if (string.IsNullOrWhiteSpace(c.IpAddress))
                                    throw new ArgumentException("IpAddress is required for Modbus TCP");
                                if (!c.Port.HasValue || c.Port <= 0 || c.Port > 65535)
                                    throw new ArgumentOutOfRangeException(nameof(c.Port));
                                if (!c.SlaveId.HasValue || c.SlaveId < 0 || c.SlaveId > 247)
                                    throw new ArgumentOutOfRangeException(nameof(c.SlaveId),
                                        "SlaveId is required for Modbus TCP (0-247)");
                            }
                            else if (c.ModbusMode == ModbusConnectionMode.Rtu)
                            {
                                if (string.IsNullOrWhiteSpace(c.SerialPort))
                                    throw new ArgumentException("SerialPort is required for Modbus RTU");
                                if (!ValidSerialPortRegex.IsMatch(c.SerialPort.Trim()))
                                    throw new ArgumentException("Invalid SerialPort format. Use COM1-COM256 or /dev/ttyS0, /dev/ttyUSB0, /dev/ttyACM0, /dev/ttyAMA0.");
                                if (!c.BaudRate.HasValue)
                                    throw new ArgumentException("BaudRate is required for Modbus RTU");
                                if (!c.SlaveId.HasValue || c.SlaveId < 0 || c.SlaveId > 247)
                                    throw new ArgumentOutOfRangeException(nameof(c.SlaveId),
                                        "SlaveId is required for Modbus RTU (0-247)");
                            }
                        }
                        else if (c.Protocol == DeviceProtocol.OpcUa)
                        {
                            if (string.IsNullOrWhiteSpace(c.ConnectionString))
                                throw new ArgumentException(
                                    "ConnectionString is required for OPC UA");

                            if (!c.ConnectionMode.HasValue)
                                throw new ArgumentException(
                                    "ConnectionMode is required for OPC UA");

                            if (c.ConnectionMode == OpcUaConnectionMode.Polling &&
                                !c.PollIntervalMs.HasValue)
                                throw new ArgumentException(
                                    "PollIntervalMs is required for OPC UA Polling");
                        }
                        else
                        {
                            throw new InvalidOperationException("Unsupported protocol");
                        }

                        var cfg = new DeviceConfiguration
                        {
                            ConfigurationId = Guid.NewGuid(),
                            Name = string.IsNullOrWhiteSpace(c.Name)
                                ? $"{device.Name}-cfg"
                                : c.Name.Trim(),

                            Protocol = c.Protocol,

                            // OPC UA
                            ConnectionString = c.Protocol == DeviceProtocol.OpcUa
                                ? c.ConnectionString
                                : null,

                            ConnectionMode = c.Protocol == DeviceProtocol.OpcUa
                                ? c.ConnectionMode
                                : null,

                            // Polling
                            PollIntervalMs = c.Protocol == DeviceProtocol.Modbus
                                ? c.PollIntervalMs ?? 1000
                                : c.ConnectionMode == OpcUaConnectionMode.Polling
                                    ? c.PollIntervalMs
                                    : null,

                            // MODBUS
                            IpAddress = c.Protocol == DeviceProtocol.Modbus ? c.IpAddress : null,
                            Port = c.Protocol == DeviceProtocol.Modbus ? c.Port : null,
                            SlaveId = c.Protocol == DeviceProtocol.Modbus ? c.SlaveId : null,
                            Endian = c.Protocol == DeviceProtocol.Modbus ? c.Endian : null,
                            ModbusMode = c.Protocol == DeviceProtocol.Modbus ? c.ModbusMode : null,
                            SerialPort = c.Protocol == DeviceProtocol.Modbus ? c.SerialPort : null,
                            BaudRate = c.Protocol == DeviceProtocol.Modbus ? c.BaudRate : null,
                            Parity = c.Protocol == DeviceProtocol.Modbus ? c.Parity : null
                        };

                        await _db.DeviceConfigurations.AddAsync(cfg, ct);
                        device.DeviceConfigurationId = cfg.ConfigurationId;
                    }


                    await _db.Devices.AddAsync(device, ct);
                    await _db.SaveChangesAsync(ct);

                    result.CreatedDeviceIds.Add(device.DeviceId);
                    _log.LogInformation("Created device {DeviceId}", device.DeviceId);
                }
                catch (Exception ex)
                {
                    _log.LogWarning(ex, "Failed to create device {DeviceName}", dto.Name);
                    result.Errors.Add($"Device '{dto.Name}': {ex.Message}");
                }
            }

            await tx.CommitAsync(ct);
            return result;
        }




        public async Task<List<DeviceConfigurationResponseDto>> GetDeviceConfigurationsByGatewayAsync(
            string gatewayId,
            CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(gatewayId))
                throw new ArgumentException("GatewayId cannot be empty.", nameof(gatewayId));

            // STEP 1: Get gateway devices
            var gatewayDevices = await _db.Devices
                .AsNoTracking()
                .Where(d => d.GatewayId == gatewayId && !d.IsDeleted)
                .Select(d => new { d.DeviceId, d.Protocol })
                .ToListAsync(ct);

            if (!gatewayDevices.Any())
                throw new KeyNotFoundException($"No devices found for GatewayId '{gatewayId}'.");

            var gatewayDeviceIds = gatewayDevices.Select(d => d.DeviceId).ToList();

            // STEP 2: Load signals directly from Signals table for these devices
            var signals = await _assetDb.Signals
                .AsNoTracking()
                .Where(s => gatewayDeviceIds.Contains(s.DeviceId))
                .Select(s => new
                {
                    s.SignalId,
                    s.DeviceId,
                    s.RegisterId,
                    s.OpcUaNodeId,
                    s.SignalName,
                    s.MinThreshold,
                    s.MaxThreshold
                })
                .ToListAsync(ct);

            if (!signals.Any())
                return new List<DeviceConfigurationResponseDto>();

            var mappedDeviceIds = signals.Select(s => s.DeviceId).Distinct().ToList();

            // STEP 3: Load devices fully
            var devices = await _db.Devices
                .AsNoTracking()
                .Where(d => mappedDeviceIds.Contains(d.DeviceId) && !d.IsDeleted)
                .Include(d => d.DeviceConfiguration)
                .Include(d => d.DeviceSlave).ThenInclude(s => s.Registers)
                .Include(d => d.OpcUaNodes)
                .ToListAsync(ct);

            if (!devices.Any())
                return new List<DeviceConfigurationResponseDto>();

            // STEP 4: Build lookups

            // RegisterId → SignalId
            var registerToSignal = signals
                .Where(s => s.RegisterId.HasValue)
                .ToDictionary(s => s.RegisterId!.Value, s => s.SignalId);

            // OpcUaNodeId → SignalId
            var opcNodeToSignal = signals
                .Where(s => s.OpcUaNodeId.HasValue)
                .ToDictionary(s => s.OpcUaNodeId!.Value, s => s.SignalId);

            // Mapped RegisterIds per device
            var mappedRegistersByDevice = signals
                .Where(s => s.RegisterId.HasValue)
                .GroupBy(s => s.DeviceId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(x => x.RegisterId!.Value).ToHashSet()
                );

            // Mapped OpcUaNodeIds per device
            var mappedOpcNodesByDevice = signals
                .Where(s => s.OpcUaNodeId.HasValue)
                .GroupBy(s => s.DeviceId)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(x => x.OpcUaNodeId!.Value).ToHashSet()
                );

            // STEP 5: Build response
            var result = devices.Select(device =>
            {
                var cfg = device.DeviceConfiguration;
                var isModbus = device.Protocol == DeviceProtocol.Modbus;
                var isOpcUa = device.Protocol == DeviceProtocol.OpcUa;

                return new DeviceConfigurationResponseDto
                {
                    DeviceId = device.DeviceId,
                    Name = device.Name,
                    Protocol = device.Protocol,

                    OpcUaMode = isOpcUa ? cfg?.ConnectionMode?.ToString() : null,

                    PollIntervalMs = cfg == null ? null :
                        isModbus
                            ? cfg.PollIntervalMs ?? 1000
                            : cfg.ConnectionMode == OpcUaConnectionMode.Polling
                                ? cfg.PollIntervalMs
                                : 0,

                    // Modbus fields
                    IpAddress = isModbus ? cfg?.IpAddress : null,
                    Port = isModbus ? cfg?.Port : null,
                    SlaveId = isModbus && cfg?.SlaveId.HasValue == true ? (byte?)cfg.SlaveId.Value : null,
                    Endian = isModbus ? cfg?.Endian : null,

                    // NEW — Modbus RTU fields
                    ModbusMode = isModbus ? cfg?.ModbusMode?.ToString() : null,
                    SerialPort = isModbus && cfg?.ModbusMode == ModbusConnectionMode.Rtu ? cfg?.SerialPort : null,
                    BaudRate = isModbus && cfg?.ModbusMode == ModbusConnectionMode.Rtu ? cfg?.BaudRate : null,
                    Parity = isModbus && cfg?.ModbusMode == ModbusConnectionMode.Rtu ? cfg?.Parity : null,


                    // OPC UA fields
                    ConnectionString = isOpcUa ? cfg?.ConnectionString : null,

                    // MODBUS
                    Slaves = isModbus
                        ? device.DeviceSlave
                            .Where(s => s.IsHealthy)
                            .Select(s => new SlaveDto
                            {
                                DeviceSlaveId = s.deviceSlaveId,
                                SlaveIndex = s.slaveIndex,
                                IsHealthy = s.IsHealthy,
                                Registers = s.Registers
                                    .Where(r =>
                                        r.IsHealthy &&
                                        mappedRegistersByDevice.TryGetValue(device.DeviceId, out var regIds) &&
                                        regIds.Contains(r.RegisterId))
                                    .OrderBy(r => r.RegisterAddress)
                                    .Select(r => new DeviceRegisterDto
                                    {
                                        RegisterId = r.RegisterId,
                                        SignalId = registerToSignal.TryGetValue(r.RegisterId, out var sigId)
                                            ? sigId : null,
                                        RegisterAddress = r.RegisterAddress,
                                        RegisterLength = r.RegisterLength,
                                        DataType = r.DataType,
                                        Scale = r.Scale,
                                        Unit = r.Unit,
                                        ByteOrder = r.ByteOrder,
                                        WordSwap = r.WordSwap,
                                        IsHealthy = r.IsHealthy
                                    })
                                    .ToList()
                            })
                            .ToList()
                        : new List<SlaveDto>(),

                    // OPC UA
                    OpcUaNodes = isOpcUa
                        ? device.OpcUaNodes
                            .Where(n =>
                                mappedOpcNodesByDevice.TryGetValue(device.DeviceId, out var nodeIds) &&
                                nodeIds.Contains(n.OpcUaNodeId))
                            .OrderBy(n => n.SignalName)
                            .Select(n => new OpcUaNodeDto
                            {
                                OpcUaNodeId = n.OpcUaNodeId,
                                NodeId = n.NodeId,
                                SignalId = opcNodeToSignal.TryGetValue(n.OpcUaNodeId, out var sigId)
                                    ? sigId : null,
                                SignalName = n.SignalName,
                                DataType = n.DataType,
                                Unit = n.Unit,
                                ScalingFactor = n.ScalingFactor
                            })
                            .ToList()
                        : new List<OpcUaNodeDto>()
                };
            }).ToList();

            return result;
        }
    }

}
