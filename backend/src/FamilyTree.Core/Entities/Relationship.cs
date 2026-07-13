using FamilyTree.Core.Enums;

namespace FamilyTree.Core.Entities;

public class Relationship
{
    public Guid Id { get; set; }

    public Guid SourcePersonId { get; set; }
    public Person SourcePerson { get; set; } = null!;

    public Guid TargetPersonId { get; set; }
    public Person TargetPerson { get; set; } = null!;

    public RelationshipType Type { get; set; }

    // Relationship subtypes (nullable based on core Type)
    public ParentChildType? ParentChildType { get; set; }
    public PartnerType? PartnerType { get; set; }

    // Historical details for partners (e.g., date of marriage or separation)
    public DateTime? StartDate { get; set; }
    public int? StartYear { get; set; }
    public DateTime? EndDate { get; set; }
    public int? EndYear { get; set; }
}
