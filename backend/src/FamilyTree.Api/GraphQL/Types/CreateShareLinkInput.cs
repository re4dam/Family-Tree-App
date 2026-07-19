using System;

namespace FamilyTree.Api.GraphQL.Types;

public record CreateShareLinkInput(
    Guid TargetPersonId,
    string ViewMode,
    string ExpiryOption, // "1week", "1month", "1year", "never", "custom"
    DateTime? CustomExpiryDate
);
