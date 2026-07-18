using System.Collections.Generic;
using FamilyTree.Core.Entities;

namespace FamilyTree.Api.GraphQL.Types;

public record SubtreePayload(
    List<Person> People,
    List<Relationship> Relationships
);
