using System;
using FamilyTree.Core.Enums;

namespace FamilyTree.Api.GraphQL.Types;

public record CreatePersonInput(
    string FirstName,
    string LastName,
    string? Nickname,
    Gender Gender,
    DateTime? BirthDate,
    int? EstimatedBirthYear,
    DateTime? DeathDate,
    string? BirthPlace,
    string? PhotoUrl,
    string? Notes,
    bool IsUnknown = false
);
