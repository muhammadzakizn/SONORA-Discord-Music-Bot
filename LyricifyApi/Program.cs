using LyricifyApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

// Register LyricsService as singleton
builder.Services.AddSingleton<LyricsService>();

// Configure CORS for local development
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();

app.MapControllers();

// Health check endpoint
app.MapGet("/health", () => new
{
    status = "healthy",
    service = "LyricifyApi",
    version = "1.0.0",
    timestamp = DateTime.UtcNow
});

// Root endpoint
app.MapGet("/", () => new
{
    name = "Lyricify API",
    description = "Lyrics service with syllable timing from QQ Music, Netease, and Kugou",
    version = "1.0.0",
    endpoints = new[]
    {
        "GET /health - Health check",
        "GET /api/lyrics/search?title=&artist=&source= - Search songs",
        "GET /api/lyrics/qqmusic/{songId} - Get QQ Music lyrics",
        "GET /api/lyrics/netease/{songId} - Get Netease lyrics",
        "GET /api/lyrics/kugou/{songHash} - Get Kugou lyrics",
        "GET /api/lyrics/auto?title=&artist= - Auto search and get lyrics"
    }
});

// Configure Kestrel to listen on specific port
app.Urls.Add("http://0.0.0.0:5050");

app.Run();
