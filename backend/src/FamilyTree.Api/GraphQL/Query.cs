using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using FamilyTree.Api.GraphQL.Types;
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

    [Authorize]
    public async Task<SubtreePayload> GetSubtreeAsync(
        Guid focalPersonId,
        int depth,
        FamilyTreeDbContext db)
    {
        if (depth < 0) depth = 0;
        if (depth > 5) depth = 5;

        var loadedPersonIds = new HashSet<Guid> { focalPersonId };
        var activeFrontier = new HashSet<Guid> { focalPersonId };

        for (int d = 0; d < depth; d++)
        {
            if (activeFrontier.Count == 0) break;

            var relationships = await db.Relationships
                .Where(r => activeFrontier.Contains(r.SourcePersonId) || activeFrontier.Contains(r.TargetPersonId))
                .Select(r => new { r.SourcePersonId, r.TargetPersonId })
                .ToListAsync();

            var nextFrontier = new HashSet<Guid>();
            foreach (var r in relationships)
            {
                if (!loadedPersonIds.Contains(r.SourcePersonId))
                {
                    nextFrontier.Add(r.SourcePersonId);
                    loadedPersonIds.Add(r.SourcePersonId);
                }
                if (!loadedPersonIds.Contains(r.TargetPersonId))
                {
                    nextFrontier.Add(r.TargetPersonId);
                    loadedPersonIds.Add(r.TargetPersonId);
                }
            }

            activeFrontier = nextFrontier;
        }

        var people = await db.People
            .Where(p => loadedPersonIds.Contains(p.Id))
            .ToListAsync();

        var relList = await db.Relationships
            .Where(r => loadedPersonIds.Contains(r.SourcePersonId) && loadedPersonIds.Contains(r.TargetPersonId))
            .ToListAsync();

        return new SubtreePayload(people, relList);
    }
}

