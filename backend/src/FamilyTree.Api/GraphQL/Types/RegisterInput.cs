using System;

namespace FamilyTree.Api.GraphQL.Types;

public record RegisterInput(
    string Username,
    string Email,
    string Password,
    Guid? AssociatedPersonId = null
);
