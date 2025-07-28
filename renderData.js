function getPropertiesName(properties){
  return Object.keys(properties)
}

function findSubmitterIdsForNode(currentData, targetNodeName, results = []) {
  if (!currentData) {
    return results; // 边界条件：如果当前数据为 null/undefined，则返回
  }

  // 如果当前数据是数组，遍历数组元素
  if (Array.isArray(currentData)) {
    currentData.forEach((item) => {
      // 递归调用自身，因为数组的每个元素可能都是一个对象，包含我们要找的节点
      findSubmitterIdsForNode(item, targetNodeName, results);
    });
  }
  // 如果当前数据是对象
  else if (typeof currentData === "object") {
    // 1. 检查当前对象是否就是我们要找的 targetNodeName
    // 这适用于 targetNodeName 是一个对象内部的属性名，且该属性的值可能包含 submitter_id
    // 比如 currentData 是 study 对象，targetNodeName 是 subjects
    if (currentData[targetNodeName]) {
      // 如果 targetNodeName 对应的值是数组，遍历它
      if (Array.isArray(currentData[targetNodeName])) {
        currentData[targetNodeName].forEach((nestedItem) => {
          if (nestedItem && nestedItem.submitter_id) {
            results.push(nestedItem.submitter_id);
          }
          // 递归查找嵌套更深的 submitter_id
          findSubmitterIdsForNode(nestedItem, targetNodeName, results); // 例如 subjects 内部可能还有 treatments
        });
      }
      // 如果 targetNodeName 对应的值是对象，直接检查 submitter_id
      else if (
        typeof currentData[targetNodeName] === "object" &&
        currentData[targetNodeName] !== null
      ) {
        if (currentData[targetNodeName].submitter_id) {
          results.push(currentData[targetNodeName].submitter_id);
        }
        // 递归查找更深的 submitter_id
        findSubmitterIdsForNode(
          currentData[targetNodeName],
          targetNodeName,
          results
        );
      }
    }

    // 2. 检查当前对象本身是否包含 submitter_id，并且它可能是一个父节点
    // 这适用于 targetNodeName 像 'studies' 这样直接在顶层数组中
    // 并且数组的每个元素 (study) 本身就含有 submitter_id
    if (
      currentData.submitter_id &&
      Object.keys(currentData).includes(targetNodeName)
    ) {
      // 确保这个 submitter_id 确实是属于这个 'parentNode' 级别的
      // 这里需要根据实际情况调整逻辑
      // 对于 'studies'，我们已经通过 Array.isArray(data.studies) 处理了
      // 如果 targetNodeName 是 currentData 的一个键，并且 currentData 有 submitter_id，
      // 那么这个 submitter_id 就应该被考虑
      // 然而，更常见的是，submitter_id 属于 targetNodeName 指向的那个对象或数组的元素
      // 所以我们更关注 currentData[targetNodeName] 的内容
    }

    // 遍历当前对象的所有属性，继续递归查找
    for (const key in currentData) {
      if (Object.prototype.hasOwnProperty.call(currentData, key)) {
        findSubmitterIdsForNode(currentData[key], targetNodeName, results);
      }
    }
  }

  return results;
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
    
    // 新的数据结构是一个对象数组
    if (!data || data.length === 0) {
      Logger.log("No data available.");
      return;
    }

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
  const processedColumns = processPluralColumns(otherColumns);
  
  // 将数据中的列名加入到列名列表中
  const dataColumnsList = Array.from(dataColumns);
  
  // Combine all columns: data columns first, then submitter_id columns, then processed columns
  let allProcessedColumns = [...dataColumnsList, ...submitterIdColumns, ...processedColumns];
  
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
  
  const processedData = processDataForInsertion(nodeDataArray);
  
  if (processedData.length > 0) {
    insertProcessedData(sheet, processedData, currentHeaders);
  } else {
    SpreadsheetApp.getUi().alert("No submitter id found to insert.");
  }
}

function processDataForInsertion(nodeDataArray) {
  // 首先收集所有的列名（属性名）
  const allColumns = new Set();
  const columnValues = {};
  
  // 遍历数组，收集所有属性名和对应的值
  nodeDataArray.forEach(item => {
    Object.keys(item).forEach(key => {
      allColumns.add(key);
      if (!columnValues[key]) {
        columnValues[key] = [];
      }
      columnValues[key].push(item[key]);
    });
  });
  
  // 找出最长的值数组长度，这将决定行数
  const maxRows = Math.max(...Object.values(columnValues).map(arr => arr.length));
  
  // 构建行数据
  const processedData = [];
  for (let i = 0; i < maxRows; i++) {
    const rowData = {};
    
    // 为每一列填充值
    allColumns.forEach(column => {
      if (columnValues[column] && columnValues[column].length > 0) {
        // 如果该列只有一个值（如 project.code），则在所有行中重复这个值
        if (columnValues[column].length === 1) {
          rowData[column] = columnValues[column][0];
        } else {
          // 如果该列有多个值，按索引取值，超出范围则为空
          rowData[column] = columnValues[column][i] || '';
        }
      } else {
        rowData[column] = '';
      }
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