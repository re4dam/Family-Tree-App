using Microsoft.AspNetCore.Identity;

namespace FamilyTree.Core.Entities;

public class FamilyTreeUser : IdentityUser<Guid>
{
    // A user might be associated with a person in the tree
    public Guid? PersonId { get; set; }
    public Person? AssociatedPerson { get; set; }
}
