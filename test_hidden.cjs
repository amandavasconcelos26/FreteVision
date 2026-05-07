const XLSX = require('xlsx');
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([['Name', 'ZONA'], ['A', 'ZONA URBANA'], ['B', 'ZONA RURAL']]);
ws['!rows'] = [{hidden: false}, {hidden: false}, {hidden: true}];
wb.SheetNames.push('Sheet1');
wb.Sheets['Sheet1'] = ws;
XLSX.writeFile(wb, 'test.xlsx');
console.log('OK');
