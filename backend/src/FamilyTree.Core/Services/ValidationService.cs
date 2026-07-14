using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FamilyTree.Core.Services;

public class ValidationService
{
    /// <summary>
    /// Checks if adding a parent-child relationship (parentId -> childId) would introduce a cycle.
    /// Returns true if it would create a cycle (invalid), otherwise false.
    /// </summary>
    public async Task<bool> WouldCreateCycleAsync(Guid parentId, Guid childId, Func<Guid, Task<List<Guid>>> getChildrenIds)
    {
        if (parentId == childId)
        {
            return true;
        }

        // We check if the proposed parent (parentId) is already a descendant of the proposed child (childId).
        // If childId can reach parentId through children relationships, then parentId is a descendant,
        // and setting parentId as parent of childId would form a cycle.
        var visited = new HashSet<Guid> { childId };
        var queue = new Queue<Guid>();
        queue.Enqueue(childId);

        while (queue.Count > 0)
        {
            var currentId = queue.Dequeue();
            var children = await getChildrenIds(currentId);

            foreach (var childOfCurrent in children)
            {
                if (childOfCurrent == parentId)
                {
                    return true; // Cycle detected
                }

                if (!visited.Contains(childOfCurrent))
                {
                    visited.Add(childOfCurrent);
                    queue.Enqueue(childOfCurrent);
                }
            }
        }

        return false; // Safe to add relationship
    }
}
