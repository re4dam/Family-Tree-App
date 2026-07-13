using FamilyTree.Core.Enums;

namespace FamilyTree.Core.Entities;

public class Person
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Nickname { get; set; }
    public Gender Gender { get; set; }

    // Date representation: either a full date or an estimated year, not both
    public DateTime? BirthDate { get; set; }
    public int? EstimatedBirthYear { get; set; }

    public DateTime? DeathDate { get; set; }
    public string? BirthPlace { get; set; }
    public string? PhotoUrl { get; set; }
    public string? Notes { get; set; }

    // Placeholder support for unknown parents
    public bool IsUnknown { get; set; }

    // Derived property: living status based on presence of death date
    public bool IsLiving => DeathDate == null;

    // Navigation properties for relationships
    public ICollection<Relationship> RelationshipsAsSource { get; set; } = new List<Relationship>();
    public ICollection<Relationship> RelationshipsAsTarget { get; set; } = new List<Relationship>();
}
