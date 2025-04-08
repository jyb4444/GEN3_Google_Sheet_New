function removeDuplicates() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("sheet1");
  if (!sheet) {
    throw new Error("Sheet1 does not exist.");
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow <= 1) {
    Logger.log("No data to check for duplicates.");
    return;
  }

  const range = sheet.getRange(2, 1, lastRow - 1, lastColumn); // Exclude header row
  const data = range.getValues();

  // Use a Map to keep track of unique rows
  const uniqueRows = new Map();
  const rowsToDelete = [];

  data.forEach((row, index) => {
    const rowKey = row.join("|"); // Create a unique key based on the row contents
    if (uniqueRows.has(rowKey)) {
      rowsToDelete.push(index + 2); // Track the row index (adjusted for sheet row)
    } else {
      uniqueRows.set(rowKey, true);
    }
  });

  // Delete rows in reverse order to avoid shifting issues
  rowsToDelete.reverse().forEach(rowNum => sheet.deleteRow(rowNum));

  Logger.log(`Removed ${rowsToDelete.length} duplicate rows.`);
}