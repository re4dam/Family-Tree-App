using FamilyTree.Core.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace FamilyTree.Infrastructure.Data;

public class FamilyTreeDbContext : IdentityDbContext<FamilyTreeUser, IdentityRole<Guid>, Guid>
{
    public FamilyTreeDbContext(DbContextOptions<FamilyTreeDbContext> options)
        : base(options)
    {
    }

    public DbSet<Person> People => Set<Person>();
    public DbSet<Relationship> Relationships => Set<Relationship>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        // Configure Person entities
        builder.Entity<Person>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.FirstName).IsRequired().HasMaxLength(100);
            entity.Property(p => p.LastName).IsRequired().HasMaxLength(100);
            entity.Property(p => p.Nickname).HasMaxLength(100);
            entity.Property(p => p.BirthPlace).HasMaxLength(200);
            entity.Property(p => p.PhotoUrl).HasMaxLength(1000);
            entity.Property(p => p.Notes).HasMaxLength(2000);
        });

        // Configure Relationship entities (representing the edges)
        builder.Entity<Relationship>(entity =>
        {
            entity.HasKey(r => r.Id);

            // Configure the SourcePerson relationship navigation
            entity.HasOne(r => r.SourcePerson)
                .WithMany(p => p.RelationshipsAsSource)
                .HasForeignKey(r => r.SourcePersonId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure the TargetPerson relationship navigation
            entity.HasOne(r => r.TargetPerson)
                .WithMany(p => p.RelationshipsAsTarget)
                .HasForeignKey(r => r.TargetPersonId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Configure FamilyTreeUser relation to Person
        builder.Entity<FamilyTreeUser>(entity =>
        {
            entity.HasOne(u => u.AssociatedPerson)
                .WithMany()
                .HasForeignKey(u => u.PersonId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
