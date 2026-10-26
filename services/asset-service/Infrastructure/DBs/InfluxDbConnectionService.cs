using Application.Interface;
using InfluxDB.Client;
using Infrastructure.Configuration;
using Microsoft.Extensions.Options;
using Serilog;

public class InfluxDbConnectionService : IInfluxDbConnectionService
{
    private InfluxDBClient _client = null!; 
    private readonly string _bucket;

    private readonly string _org;
    private readonly InfluxDbOptions _config;

    public InfluxDbConnectionService(IOptions<InfluxDbOptions> options)
    {
        _config = options.Value;
        _bucket = _config.InfluxBucket;
        _org = _config.InfluxOrg;
    }

    public InfluxDBClient GetClient() => _client;

    public async Task<bool> TryInitializeAsync()
    {
        try
        {
            var influxOptions = InfluxDBClientOptions.Builder
                .CreateNew()
                .Url(_config.InfluxUrl)
                .AuthenticateToken(_config.InfluxToken)
                .TimeOut(TimeSpan.FromMilliseconds(_config.InfluxTimout))
                .Build();

            _client = new InfluxDBClient(influxOptions);

            await EnsureBucketExistsAsync();
            Log.Information("InfluxDB connection established successfully at URL: {Url}", _config.InfluxUrl);
            return true;
        }
        catch (Exception ex)
        {
            Log.Error(ex, "Influx initialization failed. Retrying...");
            return false;
        }
    }

    private async Task EnsureBucketExistsAsync()
    {
        var bucketsApi = _client.GetBucketsApi();
        var bucket = await bucketsApi.FindBucketByNameAsync(_bucket);

        if (bucket == null)
        {
            Log.Warning("Bucket {Bucket} does not exist. Creating...", _bucket);

            var orgsApi = _client.GetOrganizationsApi();
            var org = (await orgsApi.FindOrganizationsAsync()).FirstOrDefault(o => o.Name == _org)
                      ?? throw new Exception($"Organization {_org} not found in InfluxDB");

            await bucketsApi.CreateBucketAsync(_bucket, org.Id);
            Log.Information("Bucket {Bucket} created successfully", _bucket);
        }
        else
        {
            Log.Information("Bucket {Bucket} already exists", _bucket);
        }
    }
}
