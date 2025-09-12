function getPropertiesName(properties){
  return Object.keys(properties)
}

function generateParentSubmitterIdColumnName(pluralNodeName) {
  let singularNodeName = "";
  if (pluralNodeName.endsWith("ies")) {
    singularNodeName = pluralNodeName.slice(0, -3) + "y";
  } else if (pluralNodeName.endsWith("s")) {
    singularNodeName = pluralNodeName.slice(0, -1);
  } else {
    singularNodeName = pluralNodeName;
    console.warn(`Warning: '${pluralNodeName}' does not end with 's' or 'ies'. Assuming it's already singular or needs custom handling.`);
  }

  return `${singularNodeName}.submitter_id`;
}

function displayResults(node, data, properties, hiddenProperties) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // if (node === "study") {
    //   handleStudyNode(sheet, node);
    //   return;
    // }
    
    if (!data || data.length === 0) {
      Logger.log("No data available.");
      return;
    }
    // SpreadsheetApp.getUi().alert(JSON.stringify(data))
    const columnNames = buildColumnNames(node, properties, hiddenProperties, data);
    setupSheet(sheet, columnNames, properties, hiddenProperties);
    insertData(sheet, data, columnNames);
    
    finalizeSheet(sheet, columnNames);
    Logger.log("Data rendered to sheet successfully.");
    
  } catch (err) {
    const ui = SpreadsheetApp.getUi();
    ui.alert(`Error: ${err.message}\nDetails: ${err.stack}`);
  }
}

function handleStudyNode(sheet, node) {
  sheet.clear();
  clearRulesNotesAndDropdowns(sheet);
  fetchDataByNode(node);
}

function buildColumnNames(node, properties, hiddenProperties, data = []) {
  const checkHiddenProperties = new Set(hiddenProperties);
  
  // Get visible property names from properties
  const visibleProperties = Object.keys(properties).filter(
    item => !checkHiddenProperties.has(item)
  );
  
  // 从数据中提取实际存在的列名
  const dataColumns = new Set();
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      dataColumns.add(key);
    });
  });
  
  // Extract and remove provenance column if it exists
  const provenanceIndex = visibleProperties.indexOf('provenance');
  let provenanceColumn = null;
  if (provenanceIndex !== -1) {
    provenanceColumn = visibleProperties.splice(provenanceIndex, 1)[0];
  }
  
  // Separate submitter_id columns from other columns
  const { submitterIdColumns, otherColumns } = separateSubmitterIdColumns(visibleProperties);
  
  // Process plural column names to "columnName.submitter_id" format
  // const processedColumns = processPluralColumns(otherColumns);
  const processedColumns = otherColumns;
  
  // 将数据中的列名加入到列名列表中
  const dataColumnsList = Array.from(dataColumns);
  // SpreadsheetApp.getUi().alert(JSON.stringify(dataColumnsList))
  // SpreadsheetApp.getUi().alert(JSON.stringify(submitterIdColumns))
  // SpreadsheetApp.getUi().alert(JSON.stringify(processedColumns))
  // Combine all columns: data columns first, then submitter_id columns, then processed columns
  let allProcessedColumns = [...dataColumnsList, ...processedColumns];
  
  // Remove duplicate column names
  const uniqueColumns = removeDuplicateColumns(allProcessedColumns);
  
  // Add provenance column at the end if it exists
  if (provenanceColumn) {
    uniqueColumns.push(provenanceColumn);
  }
  
  return uniqueColumns;
}

function separateSubmitterIdColumns(columns) {
  const submitterIdColumns = [];
  const otherColumns = [];
  
  columns.forEach(column => {
    if (column.includes('submitter_id')) {
      submitterIdColumns.push(column);
    } else {
      otherColumns.push(column);
    }
  });
  
  return { submitterIdColumns, otherColumns };
}

function processPluralColumns(columns) {
  return columns.map(column => {
    // Check if it's plural (simple plural check: ends with 's' but not 'ss')
    if (column.endsWith('s') && !column.endsWith('ss') && column.length > 1) {
      return generateParentSubmitterIdColumnName(column);
    }
    return column;
  });
}

function removeDuplicateColumns(columns) {
  const uniqueColumns = [];
  const seenColumns = new Set();
  
  columns.forEach(column => {
    if (!seenColumns.has(column)) {
      seenColumns.add(column);
      uniqueColumns.push(column);
    }
  });
  
  return uniqueColumns;
}

function setupSheet(sheet, columnNames, properties, hiddenProperties) {
  sheet.clear();
  clearRulesNotesAndDropdowns(sheet);
  sheet.appendRow(columnNames);
  
  setupDropdownsAndNotes(sheet, columnNames, properties, hiddenProperties);
}

function setupDropdownsAndNotes(sheet, columnNames, properties, hiddenProperties) {
  const checkHiddenProperties = new Set(hiddenProperties);
  const visibleProperties = Object.keys(properties).filter(
    item => !checkHiddenProperties.has(item)
  );
  
  visibleProperties.forEach(propertyName => {
    const columnIndex = columnNames.indexOf(propertyName);
    if (columnIndex === -1) return;
    
    const actualColumnIndex = columnIndex + 1; // Excel columns start from 1
    const propertyConfig = properties[propertyName];
    
    // Setup dropdown menu
    setupDropdown(sheet, propertyConfig, actualColumnIndex);

    // Setup notes
    setupNote(sheet, propertyConfig, actualColumnIndex);
  });
}

function setupDropdown(sheet, propertyConfig, columnIndex) {
  if (propertyConfig && propertyConfig.enum && propertyConfig.enum.length > 0) {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(propertyConfig.enum)
      .setAllowInvalid(false)
      .build();
    sheet.getRange(2, columnIndex, sheet.getMaxRows() - 1).setDataValidation(rule);
  }
}

function setupNote(sheet, propertyConfig, columnIndex) {
  if (propertyConfig && propertyConfig.term && propertyConfig.term.description) {
    sheet.getRange(1, columnIndex).setNote(propertyConfig.term.description);
  } else if (propertyConfig && propertyConfig.description) {
    sheet.getRange(1, columnIndex).setNote(propertyConfig.description);
  }
}

function insertData(sheet, nodeDataArray, columnNames) {
  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  // SpreadsheetApp.getUi().alert(JSON.stringify(columnNames))
  const processedData = processDataForInsertion(nodeDataArray, columnNames);
  
  if (processedData.length > 0) {
    insertProcessedData(sheet, processedData, currentHeaders);
  } else {
    SpreadsheetApp.getUi().alert("No submitter id found to insert.");
  }
}

function processDataForInsertion(nodeDataArray, columnNames) {
  const allColumns = new Set(columnNames);
  const columnValues = {};
  
  allColumns.forEach(column => {
    columnValues[column] = [];
  });
  // SpreadsheetApp.getUi().alert(JSON.stringify(nodeDataArray))
  nodeDataArray.forEach(item => {
    allColumns.forEach(key => {
      if (item.hasOwnProperty(key)) {
        columnValues[key].push(item[key]);
      } else {
        columnValues[key].push('');
      }
    });
  });
  
  const maxRows = nodeDataArray.length;
  
  const processedData = [];
  for (let i = 0; i < maxRows; i++) {
    const rowData = {};
    
    allColumns.forEach(column => {
      rowData[column] = columnValues[column][i] || '';
    });
    
    processedData.push(rowData);
  }
  
  return processedData;
}

function insertProcessedData(sheet, processedData, currentHeaders) {
  const PROVENANCE_VALUE = "v0.2.1-9-g520a259";

  // Convert object array to 2D array, ensuring each row follows currentHeaders order
  const values = processedData.map(record => 
    currentHeaders.map(header => {
      if (header === 'provenance') {
        return PROVENANCE_VALUE;
      }

      const value = record[header];
      return value !== undefined && value !== null ? value : '';
    })
  );
  
  // Get data insertion range (starting from row 2, since row 1 is headers)
  const dataRange = sheet.getRange(2, 1, values.length, currentHeaders.length);
  
  // Batch insert data
  dataRange.setValues(values);
  
  SpreadsheetApp.getUi().alert(`Successfully inserted ${values.length} rows for submitter id.`);
}

function finalizeSheet(sheet, columnNames) {
  deleteEmptyRows(sheet);
  sheet.autoResizeColumns(1, columnNames.length);
}

function deleteEmptyRows(sheet) {
  const lastRow = sheet.getLastRow();
  const maxRows = sheet.getMaxRows();

  if (lastRow < maxRows) {
    sheet.deleteRows(lastRow + 1, maxRows - lastRow);
  }

  Logger.log("Empty rows deleted.");
}

function renderAdditionalPropertiesToSheet(nodeSchema) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  const properties = nodeSchema.properties;
  const systemProperties = ["created_datetime", "updated_datetime", "id", "project_id", "state"];

  let startColumn = sheet.getLastColumn() + 1;

  for (let propName in properties) {
    if (systemProperties.includes(propName)) {
      continue;
    }

    const property = properties[propName];
    const column = startColumn++;

    sheet.getRange(1, column).setValue(propName);

    if (property.description) {
      sheet.getRange(1, column).setNote(property.description);
    }

    if (property.enum) {
      const enumValues = property.enum;
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(enumValues)
        .setAllowInvalid(false)
        .build();
      sheet.getRange(2, column, sheet.getMaxRows() - 1).setDataValidation(rule);
    }
  }

  sheet.autoResizeColumns(1, sheet.getLastColumn());
}

function clearRulesNotesAndDropdowns(sheet) {
  const maxRows = sheet.getMaxRows(); 
  const maxColumns = sheet.getMaxColumns(); 

  sheet.clear();

  const fullRange = sheet.getRange(1, 1, maxRows, maxColumns);
  fullRange.clearDataValidations();
  fullRange.clearNote();

  Logger.log("Cleared all content, notes, and data validations.");
}