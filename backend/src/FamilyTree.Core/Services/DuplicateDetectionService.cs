using System;
using System.Collections.Generic;
using System.Linq;
using FamilyTree.Core.Entities;
using FamilyTree.Core.Enums;

namespace FamilyTree.Core.Services;

public class DuplicatePair
{
    public Person PersonA { get; set; } = null!;
    public Person PersonB { get; set; } = null!;
    public double Confidence { get; set; }
    public string MatchReason { get; set; } = string.Empty;
}

public class DuplicateDetectionService
{
    public List<DuplicatePair> GetPotentialDuplicates(List<Person> people)
    {
        var duplicates = new List<DuplicatePair>();

        for (int i = 0; i < people.Count; i++)
        {
            var p1 = people[i];
            for (int j = i + 1; j < people.Count; j++)
            {
                var p2 = people[j];

                // Check basic constraints
                if (p1.Id == p2.Id) continue;
                if (p1.Gender != p2.Gender) continue; // Decided: gender mismatch excludes duplicates

                // Date compatibility
                if (!FuzzyMatcher.AreDatesCompatible(p1, p2)) continue;

                // Name similarities
                double firstSim = FuzzyMatcher.NameSimilarity(p1.FirstName, p2.FirstName);
                double lastSim = FuzzyMatcher.NameSimilarity(p1.LastName, p2.LastName);
                double avgNameSim = (firstSim + lastSim) / 2.0;

                bool soundexFirst = FuzzyMatcher.Soundex(p1.FirstName) == FuzzyMatcher.Soundex(p2.FirstName);
                bool soundexLast = FuzzyMatcher.Soundex(p1.LastName) == FuzzyMatcher.Soundex(p2.LastName);

                // Exclude early if names are not similar
                if (avgNameSim < 0.65 && !(soundexFirst && soundexLast)) continue;

                // Calculate base confidence from name matching
                double confidence = avgNameSim * 0.70; // Name matching is 70% of base confidence
                if (soundexFirst && soundexLast) confidence += 0.10;

                var reasons = new List<string>();
                if (avgNameSim >= 0.85) reasons.Add("Highly similar names");
                else if (soundexFirst && soundexLast) reasons.Add("Phonetically matching names");

                // Birth/Death date bonuses
                int? b1 = p1.BirthDate?.Year ?? p1.EstimatedBirthYear;
                int? b2 = p2.BirthDate?.Year ?? p2.EstimatedBirthYear;
                if (b1.HasValue && b2.HasValue && b1.Value == b2.Value)
                {
                    confidence += 0.10;
                    reasons.Add("Same birth year");
                }

                if (p1.BirthPlace != null && p2.BirthPlace != null &&
                    p1.BirthPlace.Trim().Equals(p2.BirthPlace.Trim(), StringComparison.InvariantCultureIgnoreCase))
                {
                    confidence += 0.05;
                    reasons.Add("Same birthplace");
                }

                // Relative matching bonuses
                var parents1 = p1.RelationshipsAsTarget
                    .Where(r => r.Type == RelationshipType.ParentChild)
                    .Select(r => r.SourcePersonId).ToHashSet();
                var parents2 = p2.RelationshipsAsTarget
                    .Where(r => r.Type == RelationshipType.ParentChild)
                    .Select(r => r.SourcePersonId).ToHashSet();
                int sharedParents = parents1.Intersect(parents2).Count();
                if (sharedParents > 0)
                {
                    confidence += 0.15 * sharedParents;
                    reasons.Add($"{sharedParents} shared parent(s)");
                }

                var partners1 = p1.RelationshipsAsSource
                    .Where(r => r.Type == RelationshipType.Partner)
                    .Select(r => r.TargetPersonId)
                    .Concat(p1.RelationshipsAsTarget
                        .Where(r => r.Type == RelationshipType.Partner)
                        .Select(r => r.SourcePersonId)).ToHashSet();
                var partners2 = p2.RelationshipsAsSource
                    .Where(r => r.Type == RelationshipType.Partner)
                    .Select(r => r.TargetPersonId)
                    .Concat(p2.RelationshipsAsTarget
                        .Where(r => r.Type == RelationshipType.Partner)
                        .Select(r => r.SourcePersonId)).ToHashSet();
                int sharedPartners = partners1.Intersect(partners2).Count();
                if (sharedPartners > 0)
                {
                    confidence += 0.15 * sharedPartners;
                    reasons.Add($"{sharedPartners} shared partner(s)");
                }

                var children1 = p1.RelationshipsAsSource
                    .Where(r => r.Type == RelationshipType.ParentChild)
                    .Select(r => r.TargetPersonId).ToHashSet();
                var children2 = p2.RelationshipsAsSource
                    .Where(r => r.Type == RelationshipType.ParentChild)
                    .Select(r => r.TargetPersonId).ToHashSet();
                int sharedChildren = children1.Intersect(children2).Count();
                if (sharedChildren > 0)
                {
                    confidence += 0.10 * sharedChildren;
                    reasons.Add($"{sharedChildren} shared child(ren)");
                }

                confidence = Math.Min(1.0, confidence);

                if (confidence >= 0.70)
                {
                    duplicates.Add(new DuplicatePair
                    {
                        PersonA = p1,
                        PersonB = p2,
                        Confidence = confidence,
                        MatchReason = reasons.Count > 0 ? string.Join(", ", reasons) : "Similar name characteristics"
                    });
                }
            }
        }

        // Return ordered by highest confidence first
        return duplicates.OrderByDescending(d => d.Confidence).ToList();
    }
}
