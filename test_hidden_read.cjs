const XLSX = require('xlsx');
const wb = XLSX.readFile('test.xlsx');
const ws = wb.Sheets['Sheet1'];
console.log('Original JSON:');
console.log(XLSX.utils.sheet_to_json(ws));

const range = XLSX.utils.decode_range(ws['!ref']);
console.log('Range:', range);
const headers = [];
for(let C = range.s.c; C <= range.e.c; ++C) {
    const cell = ws[XLSX.utils.encode_cell({c: C, r: range.s.r})];
    headers.push(cell ? cell.v : `UNKNOWN_${C}`);
}
console.log('Headers:', headers);

const visibleRows = [];
for(let R = range.s.r + 1; R <= range.e.r; ++R) {
    const rowIsHidden = ws['!rows'] && ws['!rows'][R] && ws['!rows'][R].hidden;
    if (rowIsHidden) continue;
    
    const rowObj = {};
    let hasData = false;
    for(let C = range.s.c; C <= range.e.c; ++C) {
        const cell = ws[XLSX.utils.encode_cell({c: C, r: R})];
        if (cell && cell.v !== undefined) {
            rowObj[headers[C - range.s.c]] = cell.v;
            hasData = true;
        }
    }
    if (hasData) {
        visibleRows.push(rowObj);
    }
}
console.log('Visible rows:', visibleRows);
