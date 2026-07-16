using System;

namespace FamilyTree.Api.GraphQL.Types;

public record UserDto(
    Guid Id,
    string Username,
    string Email,
    string Role,
    Guid? PersonId
);
