x = '2024-12-15'

// y = new Date(x).toISOString()


// // convert back to MM/dd/yyyy
// w = new Date(y).toLocaleDateString()
// console.log(x)
// console.log(y)
// console.log(w)
function formatDateForQuery(date, endOfDay = false) {
    const jsDate = new Date(date + 'T00:00:00Z');
    const day = jsDate.getUTCDate().toString().padStart(2, '0');
    const monthIndex = jsDate.getUTCMonth();
    const year = jsDate.getUTCFullYear();
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[monthIndex];
    const timeString = endOfDay ? '11:59:59 PM' : '12:00:00 AM';
    return `${monthName} ${day}, ${year} at ${timeString} UTC`;
}

console.log(formatDateForQuery(x)) // December 15, 2024 at 11:59:59 PM UTC