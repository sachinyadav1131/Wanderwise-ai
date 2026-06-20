export const DiffService = {
  calculateDiff: (beforeSnapshot, afterSnapshot) => {
    const beforeActs = beforeSnapshot?.activities || [];
    const afterActs = afterSnapshot?.activities || [];

    const added = afterActs.filter(a => !beforeActs.some(b => b.title === a.title));
    const deleted = beforeActs.filter(b => !afterActs.some(a => a.title === b.title));
    const modified = [];

    for (const after of afterActs) {
      const before = beforeActs.find(b => b._id?.toString() === after._id?.toString());
      if (before) {
        const changes = {};
        if (before.dayNumber !== after.dayNumber) changes.dayNumber = { from: before.dayNumber, to: after.dayNumber };
        if (before.timeSlot !== after.timeSlot) changes.timeSlot = { from: before.timeSlot, to: after.timeSlot };
        if (before.status !== after.status) changes.status = { from: before.status, to: after.status };
        
        if (Object.keys(changes).length > 0) {
          modified.push({ title: after.title, changes });
        }
      }
    }

    return { added, deleted, modified };
  }
};
