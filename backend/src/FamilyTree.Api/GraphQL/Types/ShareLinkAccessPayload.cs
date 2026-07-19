using System;

namespace FamilyTree.Api.GraphQL.Types;

public record ShareLinkAccessPayload(
    string Token,
    DateTime Expiration,
    Guid TargetPersonId,
    string ViewMode
);
