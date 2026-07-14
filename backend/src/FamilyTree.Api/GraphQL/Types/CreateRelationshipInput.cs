using System;
using FamilyTree.Core.Enums;

namespace FamilyTree.Api.GraphQL.Types;

public record CreateRelationshipInput(
    Guid SourcePersonId,
    Guid TargetPersonId,
    RelationshipType Type,
    ParentChildType? ParentChildType,
    PartnerType? PartnerType,
    DateTime? StartDate,
    int? StartYear,
    DateTime? EndDate,
    int? EndYear
);
