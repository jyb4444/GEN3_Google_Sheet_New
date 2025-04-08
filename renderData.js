
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

function displayResults(node, data) {
  try{
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    if(node === "study"){
      sheet.clear();
      clearRulesNotesAndDropdowns(sheet);
      // deleteEmptyRows(sheet);
      fetchDataByNode(node)
      return; 
    }
    
    const treatmentProjectIds = data.treatment_project_ids;

    if (!treatmentProjectIds || treatmentProjectIds.length === 0) {
      Logger.log("No data available.");
      return;
    }
    let fieldsList = traceToRoot(node);
    const columnNames = fieldsList;
    // SpreadsheetApp.getUi().alert(JSON.stringify(treatmentProjectIds))
    sheet.clear();
    clearRulesNotesAndDropdowns(sheet);
    sheet.appendRow(columnNames);

    const rows = [];
    const checkDuplicate = new Set();
    if(Object.keys(treatmentProjectIds[0]).length === 1){
      treatmentProjectIds.forEach((item) => {
        const { study_submitter_id } = item;
        if (checkDuplicate.has(study_submitter_id.join(" "))) {
          return;
        }
        rows.push([
            study_submitter_id.join(" ") 
          ]);

        checkDuplicate.add(study_submitter_id.join(" "));
      });
    }else{
      treatmentProjectIds.forEach((item) => {
        const { subject_submitter_id, study_submitter_id } = item;
        if (checkDuplicate.has(subject_submitter_id.join(","))) {
          return;
        }
        
        subject_submitter_id.forEach((subjectId) => {
          rows.push([
            subjectId,                   
            study_submitter_id.join(", ") 
          ]);
        });

        checkDuplicate.add(subject_submitter_id.join(","));
      });
    }

    if (rows.length > 0) {
      const actualColumnCount = rows[0].length;
      // sheet.getRange(2, 1, rows.length, columnNames.length).setValues(rows);
      sheet.getRange(2, 1, rows.length, actualColumnCount).setValues(rows);
    }

    deleteEmptyRows(sheet);

    sheet.autoResizeColumns(1, columnNames.length);
    // fetchDataByNode(node)
    Logger.log("Data rendered to sheet successfully.");
  }catch(err){
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
