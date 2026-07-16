using System;

namespace FamilyTree.Api.GraphQL.Types;

public record AuthPayload(
    string Token,
    DateTime Expiration,
    UserDto User
);
