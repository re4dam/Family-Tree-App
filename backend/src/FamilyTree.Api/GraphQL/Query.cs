using System;
using System.Linq;
using System.Threading.Tasks;
using FamilyTree.Core.Entities;
using FamilyTree.Infrastructure.Data;
using HotChocolate.Data;
using Microsoft.EntityFrameworkCore;

namespace FamilyTree.Api.GraphQL;

public class Query
{
    public string Welcome() => "Welcome to the Family Tree API!";

    [UseFiltering]
    [UseSorting]
    public IQueryable<Person> GetPeople(FamilyTreeDbContext db) => db.People;

    public async Task<Person?> GetPersonAsync(Guid id, FamilyTreeDbContext db)
    {
        return await db.People
            .Include(p => p.RelationshipsAsSource)
                .ThenInclude(r => r.TargetPerson)
            .Include(p => p.RelationshipsAsTarget)
                .ThenInclude(r => r.SourcePerson)
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    [UseFiltering]
    [UseSorting]
    public IQueryable<Relationship> GetRelationships(FamilyTreeDbContext db) => db.Relationships;
}
