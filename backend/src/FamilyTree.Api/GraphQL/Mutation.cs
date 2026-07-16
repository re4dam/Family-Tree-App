using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using FamilyTree.Api.GraphQL.Types;
using FamilyTree.Core.Entities;
using FamilyTree.Core.Enums;
using FamilyTree.Core.Services;
using FamilyTree.Infrastructure.Data;
using HotChocolate;
using HotChocolate.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace FamilyTree.Api.GraphQL;

public class Mutation
{
    public string Ping(string message) => $"Pong: {message}";

    [Authorize(Roles = new[] { "Admin", "SuperAdmin" })]
    public async Task<Person> CreatePersonAsync(CreatePersonInput input, FamilyTreeDbContext db)
    {
        var person = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = input.FirstName,
            LastName = input.LastName,
            Nickname = input.Nickname,
            Gender = input.Gender,
            BirthDate = input.BirthDate,
            EstimatedBirthYear = input.EstimatedBirthYear,
            DeathDate = input.DeathDate,
            BirthPlace = input.BirthPlace,
            PhotoUrl = input.PhotoUrl,
            Notes = input.Notes,
            IsUnknown = input.IsUnknown
        };

        db.People.Add(person);
        await db.SaveChangesAsync();
        return person;
    }

    [Authorize(Roles = new[] { "Admin", "SuperAdmin" })]
    public async Task<Person?> UpdatePersonAsync(Guid id, UpdatePersonInput input, FamilyTreeDbContext db)
    {
        var person = await db.People.FindAsync(id);
        if (person == null)
        {
            return null;
        }

        if (input.FirstName != null) person.FirstName = input.FirstName;
        if (input.LastName != null) person.LastName = input.LastName;
        if (input.Nickname != null) person.Nickname = input.Nickname;
        if (input.Gender.HasValue) person.Gender = input.Gender.Value;
        if (input.BirthDate != null) person.BirthDate = input.BirthDate;
        if (input.EstimatedBirthYear.HasValue) person.EstimatedBirthYear = input.EstimatedBirthYear.Value;
        if (input.DeathDate != null) person.DeathDate = input.DeathDate;
        if (input.BirthPlace != null) person.BirthPlace = input.BirthPlace;
        if (input.PhotoUrl != null) person.PhotoUrl = input.PhotoUrl;
        if (input.Notes != null) person.Notes = input.Notes;
        if (input.IsUnknown.HasValue) person.IsUnknown = input.IsUnknown.Value;

        await db.SaveChangesAsync();
        return person;
    }

    [Authorize(Roles = new[] { "Admin", "SuperAdmin" })]
    public async Task<bool> DeletePersonAsync(Guid id, FamilyTreeDbContext db)
    {
        var person = await db.People.FindAsync(id);
        if (person == null)
        {
            return false;
        }

        db.People.Remove(person);
        await db.SaveChangesAsync();
        return true;
    }

    [Authorize(Roles = new[] { "Admin", "SuperAdmin" })]
    public async Task<Relationship> CreateRelationshipAsync(CreateRelationshipInput input, FamilyTreeDbContext db)
    {
        if (input.SourcePersonId == input.TargetPersonId)
        {
            throw new ArgumentException("Source and Target people cannot be the same.");
        }

        var sourceExists = await db.People.AnyAsync(p => p.Id == input.SourcePersonId);
        var targetExists = await db.People.AnyAsync(p => p.Id == input.TargetPersonId);

        if (!sourceExists || !targetExists)
        {
            throw new ArgumentException("Both Source and Target people must exist.");
        }

        // Cycle validation for ParentChild relationships
        if (input.Type == RelationshipType.ParentChild)
        {
            var validationService = new ValidationService();
            var hasCycle = await validationService.WouldCreateCycleAsync(
                input.SourcePersonId,
                input.TargetPersonId,
                async (currentId) => await db.Relationships
                    .Where(r => r.SourcePersonId == currentId && r.Type == RelationshipType.ParentChild)
                    .Select(r => r.TargetPersonId)
                    .ToListAsync()
            );

            if (hasCycle)
            {
                throw new InvalidOperationException("Cycle detected: adding this parent-child relationship forms a loop.");
            }
        }

        var relationship = new Relationship
        {
            Id = Guid.NewGuid(),
            SourcePersonId = input.SourcePersonId,
            TargetPersonId = input.TargetPersonId,
            Type = input.Type,
            ParentChildType = input.ParentChildType,
            PartnerType = input.PartnerType,
            StartDate = input.StartDate,
            StartYear = input.StartYear,
            EndDate = input.EndDate,
            EndYear = input.EndYear
        };

        db.Relationships.Add(relationship);
        await db.SaveChangesAsync();
        return relationship;
    }

    [Authorize(Roles = new[] { "Admin", "SuperAdmin" })]
    public async Task<bool> DeleteRelationshipAsync(Guid id, FamilyTreeDbContext db)
    {
        var relationship = await db.Relationships.FindAsync(id);
        if (relationship == null)
        {
            return false;
        }

        db.Relationships.Remove(relationship);
        await db.SaveChangesAsync();
        return true;
    }

    [Authorize(Roles = new[] { "SuperAdmin" })]
    public async Task<bool> SeedSampleDataAsync(FamilyTreeDbContext db)
    {
        // 1. Clear existing database
        db.Relationships.RemoveRange(db.Relationships);
        db.People.RemoveRange(db.People);
        await db.SaveChangesAsync();

        // 2. Generation 1 (Grandparents)
        var arthurSr = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Arthur",
            LastName = "Pendragon",
            Nickname = "King Arthur",
            Gender = Gender.Male,
            BirthDate = new DateTime(1945, 5, 12, 0, 0, 0, DateTimeKind.Utc),
            BirthPlace = "Tintagel, Cornwall",
            Notes = "The first generation patriarch of the family tree."
        };

        var guinevere = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Guinevere",
            LastName = "Pendragon",
            Nickname = "Gwen",
            Gender = Gender.Female,
            BirthDate = new DateTime(1948, 9, 21, 0, 0, 0, DateTimeKind.Utc),
            BirthPlace = "Cameliard",
            Notes = "Grandmother and family co-founder."
        };

        db.People.AddRange(arthurSr, guinevere);

        // 3. Generation 2 (Parents & Aunts/Uncles)
        var uther = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Uther",
            LastName = "Pendragon",
            Gender = Gender.Male,
            BirthDate = new DateTime(1972, 3, 10, 0, 0, 0, DateTimeKind.Utc),
            BirthPlace = "London",
            Notes = "Arthur and Guinevere's son."
        };

        var morgana = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Morgana",
            LastName = "Pendragon",
            Nickname = "Morgan le Fay",
            Gender = Gender.Female,
            BirthDate = new DateTime(1975, 11, 4, 0, 0, 0, DateTimeKind.Utc),
            BirthPlace = "Avalon",
            Notes = "Arthur and Guinevere's daughter."
        };

        var igraine = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Igraine",
            LastName = "Pendragon",
            Gender = Gender.Female,
            BirthDate = new DateTime(1974, 12, 25, 0, 0, 0, DateTimeKind.Utc),
            BirthPlace = "Cornwall",
            Notes = "Married to Uther."
        };

        db.People.AddRange(uther, morgana, igraine);

        // 4. Generation 3 (Grandchildren)
        var arthurJr = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Arthur",
            LastName = "Pendragon Jr.",
            Nickname = "Artie",
            Gender = Gender.Male,
            BirthDate = new DateTime(2000, 8, 15, 0, 0, 0, DateTimeKind.Utc),
            BirthPlace = "Camelot Hospital",
            Notes = "Uther and Igraine's eldest son."
        };

        var kay = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Kay",
            LastName = "Pendragon",
            Gender = Gender.Male,
            BirthDate = new DateTime(2003, 2, 28, 0, 0, 0, DateTimeKind.Utc),
            Notes = "Uther and Igraine's second son."
        };

        db.People.AddRange(arthurJr, kay);
        await db.SaveChangesAsync();

        // 5. Connect Relationships
        // Arthur Sr & Guinevere Marriage
        var grandparentsMarriage = new Relationship
        {
            Id = Guid.NewGuid(),
            SourcePersonId = arthurSr.Id,
            TargetPersonId = guinevere.Id,
            Type = RelationshipType.Partner,
            PartnerType = PartnerType.Married,
            StartYear = 1970
        };

        // Uther & Igraine Marriage
        var parentsMarriage = new Relationship
        {
            Id = Guid.NewGuid(),
            SourcePersonId = uther.Id,
            TargetPersonId = igraine.Id,
            Type = RelationshipType.Partner,
            PartnerType = PartnerType.Married,
            StartYear = 1998
        };

        db.Relationships.AddRange(grandparentsMarriage, parentsMarriage);

        // Children of Generation 1 (Arthur Sr & Guinevere -> Uther & Morgana)
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = arthurSr.Id, TargetPersonId = uther.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = arthurSr.Id, TargetPersonId = morgana.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = guinevere.Id, TargetPersonId = uther.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = guinevere.Id, TargetPersonId = morgana.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });

        // Children of Generation 2 (Uther & Igraine -> Arthur Jr & Kay)
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = uther.Id, TargetPersonId = arthurJr.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = uther.Id, TargetPersonId = kay.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = igraine.Id, TargetPersonId = arthurJr.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = igraine.Id, TargetPersonId = kay.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<AuthPayload> RegisterAsync(
        RegisterInput input,
        FamilyTreeDbContext db,
        [Service] UserManager<FamilyTreeUser> userManager,
        [Service] RoleManager<IdentityRole<Guid>> roleManager,
        [Service] IConfiguration configuration)
    {
        var existingByUsername = await userManager.FindByNameAsync(input.Username);
        if (existingByUsername != null)
        {
            throw new InvalidOperationException("Username is already taken.");
        }

        var existingByEmail = await userManager.FindByEmailAsync(input.Email);
        if (existingByEmail != null)
        {
            throw new InvalidOperationException("Email is already registered.");
        }

        var user = new FamilyTreeUser
        {
            Id = Guid.NewGuid(),
            UserName = input.Username,
            Email = input.Email,
            PersonId = input.AssociatedPersonId
        };

        var result = await userManager.CreateAsync(user, input.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            throw new InvalidOperationException($"Failed to create user: {errors}");
        }

        string[] roles = { "SuperAdmin", "Admin", "Viewer" };
        foreach (var r in roles)
        {
            if (!await roleManager.RoleExistsAsync(r))
            {
                await roleManager.CreateAsync(new IdentityRole<Guid> { Id = Guid.NewGuid(), Name = r });
            }
        }

        var usersCount = await db.Users.CountAsync();
        string assignedRole = (usersCount == 1) ? "SuperAdmin" : "Viewer";
        await userManager.AddToRoleAsync(user, assignedRole);

        var (token, expiration) = GenerateJwtToken(user, assignedRole, configuration);

        return new AuthPayload(
            token,
            expiration,
            new UserDto(user.Id, user.UserName ?? string.Empty, user.Email ?? string.Empty, assignedRole, user.PersonId)
        );
    }

    public async Task<AuthPayload> LoginAsync(
        LoginInput input,
        FamilyTreeDbContext db,
        [Service] UserManager<FamilyTreeUser> userManager,
        [Service] IConfiguration configuration)
    {
        var user = await userManager.FindByNameAsync(input.UsernameOrEmail)
                   ?? await userManager.FindByEmailAsync(input.UsernameOrEmail);

        if (user == null)
        {
            throw new InvalidOperationException("Invalid username/email or password.");
        }

        var isPasswordValid = await userManager.CheckPasswordAsync(user, input.Password);
        if (!isPasswordValid)
        {
            throw new InvalidOperationException("Invalid username/email or password.");
        }

        var roles = await userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "Viewer";

        var (token, expiration) = GenerateJwtToken(user, role, configuration);

        return new AuthPayload(
            token,
            expiration,
            new UserDto(user.Id, user.UserName ?? string.Empty, user.Email ?? string.Empty, role, user.PersonId)
        );
    }

    private (string Token, DateTime Expiration) GenerateJwtToken(FamilyTreeUser user, string role, IConfiguration configuration)
    {
        var secret = configuration["Jwt:Secret"] ?? "SuperSecretSecurityKeyToVerifyTokens_Minimum256BitsLong!";
        var issuer = configuration["Jwt:Issuer"] ?? "FamilyTreeApi";
        var audience = configuration["Jwt:Audience"] ?? "FamilyTreeFrontend";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiration = DateTime.UtcNow.AddDays(7);

        var claims = new List<Claim>
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.UserName ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.UserName ?? string.Empty),
            new Claim(ClaimTypes.Role, role)
        };

        if (user.PersonId.HasValue)
        {
            claims.Add(new Claim("AssociatedPersonId", user.PersonId.Value.ToString()));
        }

        var jwtToken = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expiration,
            signingCredentials: creds
        );

        return (new JwtSecurityTokenHandler().WriteToken(jwtToken), expiration);
    }
}
