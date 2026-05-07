const XLSX = require('xlsx');
const wb = XLSX.readFile('test.xlsx');
const ws = wb.Sheets['Sheet1'];
console.log('ws[!rows]:', ws['!rows']);
