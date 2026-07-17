using System;
using System.Text;
using FamilyTree.Core.Entities;

namespace FamilyTree.Core.Services;

public static class FuzzyMatcher
{
    public static int LevenshteinDistance(string s, string t)
    {
        if (string.IsNullOrEmpty(s)) return string.IsNullOrEmpty(t) ? 0 : t.Length;
        if (string.IsNullOrEmpty(t)) return s.Length;

        s = s.ToLowerInvariant().Trim();
        t = t.ToLowerInvariant().Trim();

        int[,] d = new int[s.Length + 1, t.Length + 1];

        for (int i = 0; i <= s.Length; i++) d[i, 0] = i;
        for (int j = 0; j <= t.Length; j++) d[0, j] = j;

        for (int i = 1; i <= s.Length; i++)
        {
            for (int j = 1; j <= t.Length; j++)
            {
                int cost = (t[j - 1] == s[i - 1]) ? 0 : 1;
                d[i, j] = Math.Min(
                    Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                    d[i - 1, j - 1] + cost);
            }
        }
        return d[s.Length, t.Length];
    }

    public static double NameSimilarity(string s1, string s2)
    {
        if (string.IsNullOrEmpty(s1) || string.IsNullOrEmpty(s2)) return 0;
        
        s1 = s1.ToLowerInvariant().Trim();
        s2 = s2.ToLowerInvariant().Trim();

        if (s1 == s2) return 1.0;

        int dist = LevenshteinDistance(s1, s2);
        int maxLen = Math.Max(s1.Length, s2.Length);
        return 1.0 - ((double)dist / maxLen);
    }

    public static string Soundex(string s)
    {
        if (string.IsNullOrEmpty(s)) return "0000";
        
        s = s.ToUpperInvariant().Trim();
        
        // Remove non-letters for processing
        var cleanBuilder = new StringBuilder();
        foreach (char c in s)
        {
            if (char.IsLetter(c)) cleanBuilder.Append(c);
        }
        string clean = cleanBuilder.ToString();
        if (clean.Length == 0) return "0000";

        var sb = new StringBuilder();
        sb.Append(clean[0]);

        for (int i = 1; i < clean.Length; i++)
        {
            char code = GetSoundexCode(clean[i]);
            if (code != '0' && code != sb[sb.Length - 1])
            {
                sb.Append(code);
            }
        }

        string res = sb.ToString().Replace("0", "");
        if (res.Length < 4)
        {
            res = res.PadRight(4, '0');
        }
        return res.Substring(0, 4);
    }

    private static char GetSoundexCode(char c)
    {
        switch (c)
        {
            case 'B': case 'F': case 'P': case 'V': return '1';
            case 'C': case 'G': case 'J': case 'K': case 'Q': case 'S': case 'X': case 'Z': return '2';
            case 'D': case 'T': return '3';
            case 'L': return '4';
            case 'M': case 'N': return '5';
            case 'R': return '6';
            default: return '0';
        }
    }

    public static bool AreDatesCompatible(Person p1, Person p2)
    {
        int? y1 = p1.BirthDate?.Year ?? p1.EstimatedBirthYear;
        int? y2 = p2.BirthDate?.Year ?? p2.EstimatedBirthYear;

        // If both have birth years, they must be relatively close (within 10 years)
        if (y1.HasValue && y2.HasValue)
        {
            if (Math.Abs(y1.Value - y2.Value) > 10) return false;
        }

        int? d1 = p1.DeathDate?.Year;
        int? d2 = p2.DeathDate?.Year;

        // If both have death years, they must be relatively close (within 10 years)
        if (d1.HasValue && d2.HasValue)
        {
            if (Math.Abs(d1.Value - d2.Value) > 10) return false;
        }

        // Chronological consistency: one cannot die before the other was born
        if (y1.HasValue && d2.HasValue && d2.Value < y1.Value) return false;
        if (y2.HasValue && d1.HasValue && d1.Value < y2.Value) return false;

        return true;
    }
}
