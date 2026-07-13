namespace FamilyTree.Api.GraphQL;

public class Mutation
{
    public string Ping(string message) => $"Pong: {message}";
}
