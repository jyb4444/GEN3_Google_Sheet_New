
// const node = {
// $schema: "http://json-schema.org/draft-04/schema#",
// additionalProperties: false,
// category: "administrative",
// description: "description of treatment.",
// id: "treatment",
// links: [
// {
// exclusive: false,
// required: true,
// subgroup: [
// {
// backref: "treatments",
// label: "member_of",
// multiplicity: "many_to_many",
// name: "subjects",
// required: true,
// target_type: "subject"
// },
// {
// backref: "treatments",
// label: "member_of",
// multiplicity: "many_to_one",
// name: "cell_subjects",
// required: false,
// target_type: "cell_subject"
// }
// ]
// }
// ],
// program: "*",
// project: "*",
// properties: {
// addition_volume: {
// type: "string"
// },
// administration_volume_ml: {
// type: "number"
// },
// cell_subjects: {
// anyOf: [
// {
// items: {
// additionalProperties: true,
// maxItems: 1,
// minItems: 1,
// properties: {
// id: {
// pattern: "^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$",
// term: {
// description: "A 128-bit identifier. Depending on the mechanism used to generate it, it is either guaranteed to be different from all other UUIDs/GUIDs generated until 3400 AD or extremely likely to be different. Its relatively small size lends itself well to sorting, ordering, and hashing of all sorts, storing in databases, simple allocation, and ease of programming in general.",
// termDef: {
// cde_id: "C54100",
// cde_version: null,
// source: "NCIt",
// term: "Universally Unique Identifier",
// term_url: "https://ncit.nci.nih.gov/ncitbrowser/ConceptReport.jsp?dictionary=NCI_Thesaurus&version=16.02d&ns=NCI_Thesaurus&code=C54100"
// }
// },
// type: "string"
// },
// submitter_id: {
// type: "string"
// }
// },
// type: "object"
// },
// type: "array"
// },
// {
// additionalProperties: true,
// properties: {
// id: {
// pattern: "^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$",
// term: {
// description: "A 128-bit identifier. Depending on the mechanism used to generate it, it is either guaranteed to be different from all other UUIDs/GUIDs generated until 3400 AD or extremely likely to be different. Its relatively small size lends itself well to sorting, ordering, and hashing of all sorts, storing in databases, simple allocation, and ease of programming in general.",
// termDef: {
// cde_id: "C54100",
// cde_version: null,
// source: "NCIt",
// term: "Universally Unique Identifier",
// term_url: "https://ncit.nci.nih.gov/ncitbrowser/ConceptReport.jsp?dictionary=NCI_Thesaurus&version=16.02d&ns=NCI_Thesaurus&code=C54100"
// }
// },
// type: "string"
// },
// submitter_id: {
// type: "string"
// }
// },
// type: "object"
// }
// ]
// },
// concentration_unit: {
// type: "string"
// },
// created_datetime: {
// oneOf: [
// {
// format: "date-time",
// type: "string"
// },
// {
// type: "null"
// }
// ],
// term: {
// description: "A combination of date and time of day in the form [-]CCYY-MM-DDThh:mm:ss[Z|(+|-)hh:mm]"
// }
// },
// date: {
// type: "string"
// },
// dose_amount: {
// type: "number"
// },
// dose_amount_unit: {
// enum: [
// "milligram per kilogram",
// "microgram per kilogram",
// "milligram per kilogram per day",
// "microgram per kilogram per day",
// "Not applicable",
// "Missing",
// "Not collected",
// "Not provided",
// "Restricted access"
// ]
// },
// final_concentration: {
// type: "string"
// },
// id: {
// pattern: "^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$",
// systemAlias: "node_id",
// term: {
// description: "A 128-bit identifier. Depending on the mechanism used to generate it, it is either guaranteed to be different from all other UUIDs/GUIDs generated until 3400 AD or extremely likely to be different. Its relatively small size lends itself well to sorting, ordering, and hashing of all sorts, storing in databases, simple allocation, and ease of programming in general.",
// termDef: {
// cde_id: "C54100",
// cde_version: null,
// source: "NCIt",
// term: "Universally Unique Identifier",
// term_url: "https://ncit.nci.nih.gov/ncitbrowser/ConceptReport.jsp?dictionary=NCI_Thesaurus&version=16.02d&ns=NCI_Thesaurus&code=C54100"
// }
// },
// type: "string"
// },
// project_id: {
// term: {
// description: "Unique ID for any specific defined piece of work that is undertaken or attempted to meet a single requirement."
// },
// type: "string"
// },
// provenance: {
// description: "template version",
// type: "string"
// },
// route: {
// enum: [
// "Administration via Cytapheresis",
// "Administration via Fistula",
// "Administration via Stoma",
// "Auricular Route of Administration",
// "Combination Route of Administration",
// "Concomitant Medication Route of Administration",
// "Dental Route of Administration",
// "Dietary Route of Administration",
// "Drop Instillation Route of Administration",
// "Electro-osmosis Route of Administration",
// "Endotracheal Route of Administration",
// "Enteral Route of Administration",
// "Epilesional Route of Administration",
// "Exposure Route of Administration",
// "Exposure as Collected Route of Administration",
// "External Route of Administration",
// "Extracorporeal Circulation Route of Administration",
// "Genitourinary Route of Administration",
// "Immersion Route of Exposure",
// "In Beehive Route of Administration",
// "In Vitro Route of Administration",
// "Inhalation Route of Administration",
// "Injection Route of Administration",
// "Intestinal Route of Administration",
// "Intracavernous Route of Administration",
// "Intracavitary Route of Administration",
// "Intracholangiopancreatic Route of Administration",
// "Intracochlear Route of Administration",
// "Intraglandular Route of Administration",
// "Intrajejunal Route of Administration",
// "Intralesional Route of Administration",
// "Intramandibular Route of Administration",
// "Intrapalatal Route of Administration",
// "Intraparenchymal Route of Administration",
// "Intrasurgical Site Route of Administration",
// "Intrathalamic Route of Administration",
// "Intraurethral Route of Administration",
// "Intravaginal Route of Administration",
// "Iontophoresis Route of Administration",
// "Laryngeal Route of Administration",
// "Laryngotracheal Route of Administration",
// "Microdialysis Route of Administration",
// "Mucosal Route of Administration",
// "Nasal Route of Administration",
// "Oculonasal Route of Administration",
// "Ophthalmic Route of Administration",
// "Oral Gavage Route of Administration",
// "Oral Route of Administration",
// "Other Route of Administration",
// "Parenteral Route of Administration",
// "Not applicable",
// "Missing",
// "Not collected",
// "Not provided",
// "Restricted access"
// ]
// },
// state: {
// default: "validated",
// downloadable: [
// "uploaded",
// "md5summed",
// "validating",
// "validated",
// "error",
// "invalid",
// "released"
// ],
// oneOf: [
// {
// enum: [
// "uploading",
// "uploaded",
// "md5summing",
// "md5summed",
// "validating",
// "error",
// "invalid",
// "suppressed",
// "redacted",
// "live"
// ]
// },
// {
// enum: [
// "validated",
// "submitted",
// "released"
// ]
// }
// ],
// public: [
// "live"
// ],
// term: {
// description: "The current state of the object."
// }
// },
// stock_concentration: {
// type: "string"
// },
// subjects: {
// anyOf: [
// {
// items: {
// additionalProperties: true,
// minItems: 1,
// properties: {
// id: {
// pattern: "^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$",
// term: {
// description: "A 128-bit identifier. Depending on the mechanism used to generate it, it is either guaranteed to be different from all other UUIDs/GUIDs generated until 3400 AD or extremely likely to be different. Its relatively small size lends itself well to sorting, ordering, and hashing of all sorts, storing in databases, simple allocation, and ease of programming in general.",
// termDef: {
// cde_id: "C54100",
// cde_version: null,
// source: "NCIt",
// term: "Universally Unique Identifier",
// term_url: "https://ncit.nci.nih.gov/ncitbrowser/ConceptReport.jsp?dictionary=NCI_Thesaurus&version=16.02d&ns=NCI_Thesaurus&code=C54100"
// }
// },
// type: "string"
// },
// submitter_id: {
// type: "string"
// }
// },
// type: "object"
// },
// type: "array"
// },
// {
// additionalProperties: true,
// properties: {
// id: {
// pattern: "^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$",
// term: {
// description: "A 128-bit identifier. Depending on the mechanism used to generate it, it is either guaranteed to be different from all other UUIDs/GUIDs generated until 3400 AD or extremely likely to be different. Its relatively small size lends itself well to sorting, ordering, and hashing of all sorts, storing in databases, simple allocation, and ease of programming in general.",
// termDef: {
// cde_id: "C54100",
// cde_version: null,
// source: "NCIt",
// term: "Universally Unique Identifier",
// term_url: "https://ncit.nci.nih.gov/ncitbrowser/ConceptReport.jsp?dictionary=NCI_Thesaurus&version=16.02d&ns=NCI_Thesaurus&code=C54100"
// }
// },
// type: "string"
// },
// submitter_id: {
// type: "string"
// }
// },
// type: "object"
// }
// ]
// },
// submitter_id: {
// type: "string"
// },
// test_article_administration_duration: {
// type: "number"
// },
// test_article_administration_zt: {
// type: "number"
// },
// test_article_dtxsid: {
// type: "string"
// },
// test_article_name: {
// type: "string"
// },
// treatment_protocol: {
// type: "string"
// },
// type: {
// enum: [
// "treatment"
// ]
// },
// updated_datetime: {
// oneOf: [
// {
// format: "date-time",
// type: "string"
// },
// {
// type: "null"
// }
// ],
// term: {
// description: "A combination of date and time of day in the form [-]CCYY-MM-DDThh:mm:ss[Z|(+|-)hh:mm]"
// }
// },
// vehicle_dtxsid: {
// type: "string"
// },
// vehicle_name: {
// type: "string"
// }
// },
// required: [
// "type",
// "submitter_id",
// "treatment_protocol"
// ],
// submittable: true,
// systemProperties: [
// "id",
// "project_id",
// "state",
// "created_datetime",
// "updated_datetime"
// ],
// title: "treatment",
// type: "object",
// uniqueKeys: [
// [
// "id"
// ],
// [
// "project_id",
// "submitter_id"
// ]
// ],
// validators: null
// }

function getPropertiesName(properties){
  return Object.keys(properties)
}

function displayResults(node, data, properties, hiddenProperties) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if (node === "study") {
      sheet.clear();
      clearRulesNotesAndDropdowns(sheet);
      fetchDataByNode(node);
      return;
    }

    const treatmentProjectIds = data.data.treatment_project_ids;
    const checkHiddenProperties = new Set(hiddenProperties);

    if (!treatmentProjectIds || treatmentProjectIds.length === 0) {
      Logger.log("No data available.");
      return;
    }
    let fieldsList = traceToRoot(node);
    const columnNames1 = fieldsList;
    const columnNames2 = Object.keys(properties).filter((item) => !checkHiddenProperties.has(item)); 
    const columnNames = columnNames1.concat(columnNames2);

    sheet.clear();
    clearRulesNotesAndDropdowns(sheet);
    sheet.appendRow(columnNames);

    // 设置下拉菜单和注释
    columnNames2.forEach((propertyName, index) => {
      const columnIndex = columnNames1.length + index + 1; // 计算 columnNames2 对应的列索引
      const propertyConfig = properties[propertyName];

      // 设置下拉菜单
      if (propertyConfig && propertyConfig.enum && propertyConfig.enum.length > 0) {
        const rule = SpreadsheetApp.newDataValidation()
          .requireValueInList(propertyConfig.enum)
          .setAllowInvalid(false)
          .build();
        sheet.getRange(2, columnIndex, sheet.getMaxRows() - 1).setDataValidation(rule);
      }

      // 设置注释
      if (propertyConfig && propertyConfig.term && propertyConfig.term.description) {
        sheet.getRange(1, columnIndex).setNote(propertyConfig.term.description);
      }
    });

    const rows = [];
    const checkDuplicate = new Set();
    if (Object.keys(treatmentProjectIds[0]).length === 1) {
      treatmentProjectIds.forEach((item) => {
        const { study_submitter_id } = item;
        if (checkDuplicate.has(study_submitter_id.join(" "))) {
          return;
        }
        const rowData = [study_submitter_id.join(" ")];
        columnNames2.forEach(prop => {
          rowData.push(item[prop] || ''); // 尝试获取 properties 对应的属性值
        });
        rows.push(rowData);
        checkDuplicate.add(study_submitter_id.join(" "));
      });
    } else {
      treatmentProjectIds.forEach((item) => {
        const { subject_submitter_id, study_submitter_id } = item;
        if (checkDuplicate.has(subject_submitter_id.join(","))) {
          return;
        }

        subject_submitter_id.forEach((subjectId) => {
          const rowData = [subjectId, study_submitter_id.join(", ")];
          columnNames2.forEach(prop => {
            rowData.push(item[prop] || ''); // 尝试获取 properties 对应的属性值
          });
          rows.push(rowData);
        });

        checkDuplicate.add(subject_submitter_id.join(","));
      });
    }

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, columnNames.length).setValues(rows);
    }

    deleteEmptyRows(sheet);

    sheet.autoResizeColumns(1, columnNames.length);
    Logger.log("Data rendered to sheet successfully.");
  } catch (err) {
    const ui = SpreadsheetApp.getUi();
    ui.alert(`Error: ${err.message}\nDetails: ${err.stack}`);
  }
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

// function clearRulesNotesAndDropdowns(sheet) {
//   sheet.clearDataValidations(); // 清除数据验证规则 (包括下拉菜单)
//   const maxCols = sheet.getMaxColumns();
//   const headerRange = sheet.getRange(1, 1, 1, maxCols);
//   const notes = headerRange.getNotes();
//   const newNotes = notes.map(row => row.map(() => '')); // 创建一个相同大小的空注释数组
//   headerRange.setNotes(newNotes); // 清除标题行的注释
// }

