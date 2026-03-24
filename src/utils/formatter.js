function formatDate(date) {
    if (!date) return null;

    const d = new Date(date);
    if (isNaN(d)) return null;

    return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

module.exports = { formatDate };