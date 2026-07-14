using System.Text;
using FamilyTree.Api.GraphQL;
using FamilyTree.Core.Entities;
using FamilyTree.Infrastructure.Data;
using HotChocolate.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddOpenApi();

// 1. Configure PostgreSQL Database Context
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Database=familytree_db;Username=postgres;Password=postgres";
builder.Services.AddPooledDbContextFactory<FamilyTreeDbContext>(options =>
    options.UseNpgsql(connectionString, b => b.MigrationsAssembly("FamilyTree.Infrastructure")));

// 2. Configure ASP.NET Core Identity
builder.Services.AddIdentityCore<FamilyTreeUser>(options =>
    {
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireUppercase = true;
        options.Password.RequiredLength = 8;
        options.User.RequireUniqueEmail = true;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<FamilyTreeDbContext>()
    .AddDefaultTokenProviders();

// 3. Configure JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"] ?? "SuperSecretSecurityKeyToVerifyTokens_Minimum256BitsLong!";
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "FamilyTreeApi";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "FamilyTreeFrontend";

builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ClockSkew = TimeSpan.Zero
        };
    });

builder.Services.AddAuthorization();

// 4. Configure GraphQL with HotChocolate
builder.Services
    .AddGraphQLServer()
    .AddQueryType<Query>()
    .AddMutationType<Mutation>()
    .AddFiltering()
    .AddSorting()
    .RegisterDbContextFactory<FamilyTreeDbContext>();

// 5. Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") != "true")
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// Map GraphQL endpoint (/graphql) and Rest Controllers/Endpoints
app.MapGraphQL();

app.MapGet("/", () => "Family Tree GraphQL Server running. Navigate to /graphql for Banana Cake Pop IDE.");

// Automatically create database at startup with retry logic
using (var scope = app.Services.CreateScope())
{
    var contextFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<FamilyTreeDbContext>>();
    using var dbContext = contextFactory.CreateDbContext();
    
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    int retries = 5;
    while (retries > 0)
    {
        try
        {
            logger.LogInformation("Attempting to connect to database and ensure it is created...");
            dbContext.Database.EnsureCreated();
            logger.LogInformation("Database connection established and schema ensured.");
            break;
        }
        catch (Exception ex)
        {
            retries--;
            logger.LogWarning(ex, "Failed to connect to database. Retries remaining: {Retries}", retries);
            if (retries == 0)
            {
                logger.LogError(ex, "Could not connect to database after multiple attempts. Application exiting.");
                throw;
            }
            Thread.Sleep(3000); // Wait 3 seconds before next retry
        }
    }
}

app.Run();
