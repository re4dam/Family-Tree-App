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

        // 5. Additional Characters for Relationship Type Showcasing
        // (Deceased 1968), Arthur Sr's first wife
        var elsa = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Elsa",
            LastName = "Pendragon",
            Gender = Gender.Female,
            BirthDate = new DateTime(1946, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            DeathDate = new DateTime(1968, 6, 1, 0, 0, 0, DateTimeKind.Utc),
            Notes = "Arthur Sr's first wife (Deceased)."
        };

        // Arthur Sr's son with Elsa
        var gawain = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Gawain",
            LastName = "Pendragon",
            Gender = Gender.Male,
            BirthDate = new DateTime(1966, 10, 10, 0, 0, 0, DateTimeKind.Utc),
            Notes = "Arthur Sr's son from his first marriage."
        };

        // Adopted son of Uther & Igraine
        var mordred = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Mordred",
            LastName = "Pendragon",
            Gender = Gender.Male,
            BirthDate = new DateTime(2005, 5, 5, 0, 0, 0, DateTimeKind.Utc),
            Notes = "Adopted son of Uther and Igraine."
        };

        // Foster son of Morgana
        var galahad = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Galahad",
            LastName = "Pendragon",
            Gender = Gender.Male,
            BirthDate = new DateTime(2008, 7, 7, 0, 0, 0, DateTimeKind.Utc),
            Notes = "Foster son of Morgana."
        };

        // ex-husband of Morgana
        var lot = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Lot",
            LastName = "Orkney",
            Gender = Gender.Male,
            BirthDate = new DateTime(1970, 4, 15, 0, 0, 0, DateTimeKind.Utc),
            Notes = "Morgana's ex-husband."
        };

        // ex-partner of Morgana (Separated)
        var accolon = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Accolon",
            LastName = "Gaul",
            Gender = Gender.Male,
            BirthDate = new DateTime(1973, 9, 3, 0, 0, 0, DateTimeKind.Utc),
            Notes = "Morgana's ex-partner."
        };

        // Guardian relationship from Arthur Sr.
        var lancelot = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Lancelot",
            LastName = "Du Lac",
            Nickname = "Sir Lancelot",
            Gender = Gender.Male,
            BirthDate = new DateTime(1985, 12, 12, 0, 0, 0, DateTimeKind.Utc),
            Notes = "Arthur Sr's ward and champion."
        };

        db.People.AddRange(elsa, gawain, mordred, galahad, lot, accolon, lancelot);
        await db.SaveChangesAsync();

        // 6. Connect Relationships
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

        // Arthur Sr & Elsa Marriage (Widowed)
        var arthurElsaMarriage = new Relationship
        {
            Id = Guid.NewGuid(),
            SourcePersonId = arthurSr.Id,
            TargetPersonId = elsa.Id,
            Type = RelationshipType.Partner,
            PartnerType = PartnerType.Widowed,
            StartYear = 1965,
            EndYear = 1968
        };

        // Morgana & Lot Marriage (Divorced)
        var morganaLotMarriage = new Relationship
        {
            Id = Guid.NewGuid(),
            SourcePersonId = morgana.Id,
            TargetPersonId = lot.Id,
            Type = RelationshipType.Partner,
            PartnerType = PartnerType.Divorced,
            StartYear = 1995,
            EndYear = 2002
        };

        // Morgana & Accolon Relationship (Separated)
        var morganaAccolonRel = new Relationship
        {
            Id = Guid.NewGuid(),
            SourcePersonId = morgana.Id,
            TargetPersonId = accolon.Id,
            Type = RelationshipType.Partner,
            PartnerType = PartnerType.Separated,
            StartYear = 2005,
            EndYear = 2010
        };

        db.Relationships.AddRange(grandparentsMarriage, parentsMarriage, arthurElsaMarriage, morganaLotMarriage, morganaAccolonRel);

        // Children of Generation 1 (Arthur Sr & Guinevere -> Uther & Morgana)
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = arthurSr.Id, TargetPersonId = uther.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = arthurSr.Id, TargetPersonId = morgana.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = guinevere.Id, TargetPersonId = uther.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = guinevere.Id, TargetPersonId = morgana.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });

        // Arthur Sr & Elsa -> Gawain (Biological)
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = arthurSr.Id, TargetPersonId = gawain.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = elsa.Id, TargetPersonId = gawain.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });
        
        // Guinevere -> Gawain (Step-child)
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = guinevere.Id, TargetPersonId = gawain.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Step });

        // Children of Generation 2 (Uther & Igraine -> Arthur Jr & Kay)
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = uther.Id, TargetPersonId = arthurJr.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = uther.Id, TargetPersonId = kay.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = igraine.Id, TargetPersonId = arthurJr.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = igraine.Id, TargetPersonId = kay.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Biological });

        // Adopted Child: Mordred of Uther & Igraine
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = uther.Id, TargetPersonId = mordred.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Adoptive });
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = igraine.Id, TargetPersonId = mordred.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Adoptive });

        // Foster Child: Galahad of Morgana
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = morgana.Id, TargetPersonId = galahad.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Foster });

        // Guardian Child: Lancelot Du Lac of Arthur Sr
        db.Relationships.Add(new Relationship { Id = Guid.NewGuid(), SourcePersonId = arthurSr.Id, TargetPersonId = lancelot.Id, Type = RelationshipType.ParentChild, ParentChildType = ParentChildType.Guardian });

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

    [Authorize(Roles = new[] { "Admin", "SuperAdmin" })]
    public async Task<Person> MergePeopleAsync(
        Guid sourceId, 
        Guid targetId, 
        [Service] FamilyTreeDbContext db)
    {
        if (sourceId == targetId)
        {
            throw new ArgumentException("Cannot merge a person into themselves.");
        }

        var source = await db.People
            .Include(p => p.RelationshipsAsSource)
            .Include(p => p.RelationshipsAsTarget)
            .FirstOrDefaultAsync(p => p.Id == sourceId);

        var target = await db.People
            .Include(p => p.RelationshipsAsSource)
            .Include(p => p.RelationshipsAsTarget)
            .FirstOrDefaultAsync(p => p.Id == targetId);

        if (source == null || target == null)
        {
            throw new ArgumentException("Source or Target person not found.");
        }

        // Use transaction to ensure rollback on cycle validation failure
        using var transaction = await db.Database.BeginTransactionAsync();

        try
        {
            // 1. Merge properties
            if (string.IsNullOrEmpty(target.Nickname)) target.Nickname = source.Nickname;
            if (!target.BirthDate.HasValue) target.BirthDate = source.BirthDate;
            if (!target.EstimatedBirthYear.HasValue) target.EstimatedBirthYear = source.EstimatedBirthYear;
            if (!target.DeathDate.HasValue) target.DeathDate = source.DeathDate;
            if (string.IsNullOrEmpty(target.BirthPlace)) target.BirthPlace = source.BirthPlace;
            if (string.IsNullOrEmpty(target.PhotoUrl)) target.PhotoUrl = source.PhotoUrl;
            
            if (!string.IsNullOrEmpty(source.Notes))
            {
                if (string.IsNullOrEmpty(target.Notes))
                {
                    target.Notes = source.Notes;
                }
                else if (!target.Notes.Contains(source.Notes))
                {
                    target.Notes += $"\n\n--- Merged Biography Notes ---\n{source.Notes}";
                }
            }

            // 2. Process relationships
            var allRelationships = await db.Relationships.ToListAsync();

            // Source relationships: SourcePersonId == sourceId
            var sourceRels = allRelationships.Where(r => r.SourcePersonId == sourceId).ToList();
            foreach (var rel in sourceRels)
            {
                // Check if target already has an equivalent relationship with rel.TargetPersonId
                var exists = allRelationships.Any(r => 
                    r.SourcePersonId == targetId && 
                    r.TargetPersonId == rel.TargetPersonId && 
                    r.Type == rel.Type && 
                    r.ParentChildType == rel.ParentChildType &&
                    r.PartnerType == rel.PartnerType);

                if (exists || rel.TargetPersonId == targetId)
                {
                    db.Relationships.Remove(rel);
                }
                else
                {
                    rel.SourcePersonId = targetId;
                }
            }

            // Target relationships: TargetPersonId == sourceId
            var targetRels = allRelationships.Where(r => r.TargetPersonId == sourceId).ToList();
            foreach (var rel in targetRels)
            {
                // Check if target already has an equivalent relationship with rel.SourcePersonId
                var exists = allRelationships.Any(r => 
                    r.SourcePersonId == rel.SourcePersonId && 
                    r.TargetPersonId == targetId && 
                    r.Type == rel.Type && 
                    r.ParentChildType == rel.ParentChildType &&
                    r.PartnerType == rel.PartnerType);

                if (exists || rel.SourcePersonId == targetId)
                {
                    db.Relationships.Remove(rel);
                }
                else
                {
                    rel.TargetPersonId = targetId;
                }
            }

            // 3. Re-associate users
            var users = await db.Users.Where(u => u.PersonId == sourceId).ToListAsync();
            foreach (var user in users)
            {
                user.PersonId = targetId;
            }

            // Save modifications temporarily to run validation
            await db.SaveChangesAsync();

            // 4. Validate cycles
            var validationService = new ValidationService();
            
            var targetRelationships = await db.Relationships
                .Where(r => r.Type == RelationshipType.ParentChild && (r.SourcePersonId == targetId || r.TargetPersonId == targetId))
                .ToListAsync();

            Func<Guid, Task<List<Guid>>> getChildrenIds = async (currentId) => await db.Relationships
                .Where(r => r.SourcePersonId == currentId && r.Type == RelationshipType.ParentChild)
                .Select(r => r.TargetPersonId)
                .ToListAsync();

            foreach (var r in targetRelationships)
            {
                var hasCycle = await validationService.WouldCreateCycleAsync(
                    r.SourcePersonId,
                    r.TargetPersonId,
                    getChildrenIds
                );

                if (hasCycle)
                {
                    throw new InvalidOperationException("Merging these individuals would create a circular parent-child loop.");
                }
            }

            // Delete Candidate A (source)
            db.People.Remove(source);
            await db.SaveChangesAsync();

            await transaction.CommitAsync();
            return target;
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
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
