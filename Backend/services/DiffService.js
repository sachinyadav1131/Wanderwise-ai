export const DiffService = {
  calculateDiff: (beforeSnapshot, afterSnapshot) => {
    const beforeActs = beforeSnapshot?.activities || [];
    const afterActs = afterSnapshot?.activities || [];

    // Added: In afterActs, but has no matching _id in beforeActs (or has no _id at all)
    const added = afterActs.filter(a => {
      if (!a._id) return true;
      return !beforeActs.some(b => b._id?.toString() === a._id?.toString());
    });

    // Deleted: In beforeActs, but has no matching _id in afterActs
    const deleted = beforeActs.filter(b => {
      if (!b._id) return false; // Safety check
      return !afterActs.some(a => a._id?.toString() === b._id?.toString());
    });

    // Modified: In both, but has diffs in details
    const modified = [];
    for (const after of afterActs) {
      if (!after._id) continue;
      const before = beforeActs.find(b => b._id?.toString() === after._id?.toString());
      if (before) {
        const changes = {};
        if (before.dayNumber !== after.dayNumber) changes.dayNumber = { from: before.dayNumber, to: after.dayNumber };
        if (before.timeSlot !== after.timeSlot) changes.timeSlot = { from: before.timeSlot, to: after.timeSlot };
        if (before.status !== after.status) changes.status = { from: before.status, to: after.status };
        if (before.time !== after.time) changes.time = { from: before.time, to: after.time };
        if (before.location !== after.location) changes.location = { from: before.location, to: after.location };
        if (before.cost !== after.cost) changes.cost = { from: before.cost, to: after.cost };
        
        if (Object.keys(changes).length > 0) {
          modified.push({ title: after.title, changes });
        }
      }
    }

    return { added, deleted, modified };
  }
};
