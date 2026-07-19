using System;

namespace FamilyTree.Core.Entities;

public class ShareLink
{
    public Guid Id { get; set; }
    public string Token { get; set; } = string.Empty;
    public Guid TargetPersonId { get; set; }
    public Person TargetPerson { get; set; } = null!;
    public string ViewMode { get; set; } = "network"; // "network", "pedigree", "descendant"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
    public bool IsRevoked { get; set; }
    public int ClickCount { get; set; }

    // Read-only helpers
    public bool IsExpired => ExpiresAt.HasValue && ExpiresAt.Value < DateTime.UtcNow;
    public bool IsValid => !IsRevoked && !IsExpired;
}
