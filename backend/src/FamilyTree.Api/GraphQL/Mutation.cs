using System;
using System.Linq;
using System.Threading.Tasks;
using FamilyTree.Api.GraphQL.Types;
using FamilyTree.Core.Entities;
using FamilyTree.Core.Enums;
using FamilyTree.Core.Services;
using FamilyTree.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FamilyTree.Api.GraphQL;

public class Mutation
{
    public string Ping(string message) => $"Pong: {message}";

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
            BirthDate = new DateTime(1945, 5, 12),
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
            BirthDate = new DateTime(1948, 9, 21),
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
            BirthDate = new DateTime(1972, 3, 10),
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
            BirthDate = new DateTime(1975, 11, 4),
            BirthPlace = "Avalon",
            Notes = "Arthur and Guinevere's daughter."
        };

        var igraine = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Igraine",
            LastName = "Pendragon",
            Gender = Gender.Female,
            BirthDate = new DateTime(1974, 12, 25),
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
            BirthDate = new DateTime(2000, 8, 15),
            BirthPlace = "Camelot Hospital",
            Notes = "Uther and Igraine's eldest son."
        };

        var kay = new Person
        {
            Id = Guid.NewGuid(),
            FirstName = "Kay",
            LastName = "Pendragon",
            Gender = Gender.Male,
            BirthDate = new DateTime(2003, 2, 28),
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
}
