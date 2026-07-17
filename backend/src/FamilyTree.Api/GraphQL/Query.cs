using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FamilyTree.Core.Entities;
using FamilyTree.Core.Services;
using FamilyTree.Infrastructure.Data;
using HotChocolate.Authorization;
using HotChocolate.Data;
using Microsoft.EntityFrameworkCore;

namespace FamilyTree.Api.GraphQL;

public class Query
{
    public string Welcome() => "Welcome to the Family Tree API!";

    [Authorize]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Person> GetPeople(FamilyTreeDbContext db) => db.People;

    [Authorize]
    public async Task<Person?> GetPersonAsync(Guid id, FamilyTreeDbContext db)
    {
        return await db.People
            .Include(p => p.RelationshipsAsSource)
                .ThenInclude(r => r.TargetPerson)
            .Include(p => p.RelationshipsAsTarget)
                .ThenInclude(r => r.SourcePerson)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    [Authorize]
    [UseFiltering]
    [UseSorting]
    public IQueryable<Relationship> GetRelationships(FamilyTreeDbContext db) => db.Relationships;

    [Authorize(Roles = new[] { "Admin", "SuperAdmin" })]
    public async Task<List<DuplicatePair>> GetPotentialDuplicatesAsync(FamilyTreeDbContext db)
    {
        var people = await db.People
            .Where(p => !p.IsUnknown)
            .Include(p => p.RelationshipsAsSource)
            .Include(p => p.RelationshipsAsTarget)
            .ToListAsync();

        var service = new DuplicateDetectionService();
        return service.GetPotentialDuplicates(people);
    }
}

