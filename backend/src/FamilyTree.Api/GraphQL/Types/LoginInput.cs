namespace FamilyTree.Api.GraphQL.Types;

public record LoginInput(
    string UsernameOrEmail,
    string Password
);
