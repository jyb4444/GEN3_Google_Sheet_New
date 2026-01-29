function onOpen() {  
  var ui = SpreadsheetApp.getUi();
  DriveApp.getRootFolder();
  ui.createMenu('Gen3DataCommons')
    .addItem('Authenticate session', 'openFileUploadDialog')
    .addSeparator()
    .addItem('Populate metadata template', 'openTokenDialog')
    .addSeparator()
    .addItem('Create data files manifest', 'createUploadMetadataSheet')
    .addSeparator()
    .addItem('Submit to knowledgebase', 'showSubmitDialog')
    .addSeparator()
    .addItem('Download', 'downloadActiveSheet')
    .addToUi();
}

function showSubmitDialog() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const sheetName = sheet.getName();
  
  if (sheetName === 'Upload_Metadata_Sheet') {
    showFileUploadDialog();
  } else {
    showConfirmDialog();
  }
}

function showConfirmDialog() {
  const html = HtmlService.createHtmlOutputFromFile('SaveDialog')
    .setWidth(400)
    .setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(html, 'Confirm Submission');
}

function showFileUploadDialog() {
  const expectedFiles = getExpectedFileNames();
  const template = HtmlService.createTemplateFromFile('MetaDataFileUploadDialog');
  template.expectedFiles = JSON.stringify(expectedFiles);
  
  const html = template.evaluate()
    .setWidth(600)
    .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, 'Upload Files');
}

function deleteAllDrawingsOnActiveSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const drawings = sheet.getDrawings();

  if (drawings.length === 0) {
    SpreadsheetApp.getUi().alert("There are no drawing objects in the current worksheet.");
    return;
  }

  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Ensure to delete',
    'Are you sure to delete ' + drawings.length + ' Drawing Objects of current sheet? This action cannot be undone.',
    ui.ButtonSet.YES_NO);

  if (response == ui.Button.YES) {
    for (let i = drawings.length - 1; i >= 0; i--) {
      drawings[i].remove();
    }
    SpreadsheetApp.getUi().alert("All drawing objects were deleted successfully.");
  } else {
    SpreadsheetApp.getUi().alert("The operation was canceled.");
  }
}

function authorizeScript() {
  const rootFolder = DriveApp.getRootFolder();
  Logger.log("Root folder name: " + rootFolder.getName());
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("Spreadsheet name: " + sheet.getName());
}

// Main function to open the dialog and request the toke
function openTokenDialog() {
  const projectData = fetchProjectList();
  const studyData = fetchStudyList();
  const targetNodeData = JSON.parse(fetchTargetNodeList());
  
  const key = Object.keys(targetNodeData.data)[0];
  
  const sortedNodes = targetNodeData.data[key].sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.id.localeCompare(b.id);
  });

  const formattedNodes = sortedNodes.map(node => node.title + "-" + node.description);
  const nodeIdList = sortedNodes.reduce((acc, cur) => {
    const obj = {
      [cur.title] : cur.id
    }
    return {...acc, ...obj}
  }, {})

  // Get an array of node type IDs from the target node data
  // const nodetypes = targetNodeData.data[key].map((ele) => ele.id)

  // Create an HTML template from the file 'TokenDialog'
  var template = HtmlService.createTemplateFromFile('TokenDialog');
  
  // Pass the fetched data into the template to be used in the HTML
  template.projectData = projectData;  

  template.studyData = studyData;
  template.targetNodeData = JSON.stringify(formattedNodes); // Convert to string for HTML use
  template.nodeIdList = JSON.stringify(nodeIdList)
  
  // Evaluate and configure the dialog dimensions
  var htmlOutput = template.evaluate()
    .setWidth(400)
    .setHeight(400);
	
  // Display the dialog to the user
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Toxdatacommons Update/Create');
}

function openSaveDialog(){
  var template = HtmlService.createTemplateFromFile('SaveDialog');
  var htmlOutput = template.evaluate()
    .setWidth(400)
    .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Save and Submit');
}

// Function to get access token using refresh token
function getAccessToken(authProvider) {
    const url = `${authProvider.endpoint}/user/credentials/cdis/access_token`;
    // SpreadsheetApp.getUi().alert(url)
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        payload: JSON.stringify({
            key_id: authProvider.keyId,  
            api_key: authProvider.accessToken 
        }),
        muteHttpExceptions: true
    };
    
    try {
        const response = UrlFetchApp.fetch(url, options);

        if (response.getResponseCode() === 200) {
            const tokenData = JSON.parse(response.getContentText());
            // SpreadsheetApp.getUi().alert(JSON.stringify(tokenData))
            return tokenData.access_token;
        } else {
            throw new Error("Failed to get access token");
        }
    } catch (error) {
        Logger.log("Token Error: " + error.toString());
        throw error;
    }
}

function executeGraphQLQuery(authProvider, queryString) {
  const accessToken = getAccessToken(authProvider)
  const url = `${authProvider.endpoint}/api/v0/submission/graphql/`; 
  
  const payload = {
    query: queryString
  };

  const options = {
    method: 'POST',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json' 
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() === 200) {
    const rawResponse = response.getContentText();
    const normalizedData = normalizeResponse(rawResponse);
    return JSON.stringify(normalizedData, null, 2)
  } else {
    Logger.log("Error: " + response.getContentText());
    throw new Error("GraphQL query failed with status: " + response.getResponseCode());
  }
}

function fetchSubjectData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var authProvider = getAuthProvider(); 

  var queryTxt = `{
    aliquot (first:100){
      analyte_type
      analyte_protocol
      type
      submitter_id
      samples {
        submitter_id
        subjects {
          submitter_id
          studies (submitter_id: "PRJ161"){
            submitter_id
          }
        }
      }
    }
  }`;

  try {
    var response = executeGraphQLQuery(authProvider, queryTxt);
    if (response) {
      processAndDisplayData(JSON.parse(response))
    } else {
      Logger.log("Invalid response structure: " + JSON.stringify(response));
    }
  } catch (error) {
    Logger.log("Error: " + error);
  }
}

function processAndDisplayData(response) {
    if (!response) {
        Logger.log("Invalid response structure");
        return;
    }

    const sheet = SpreadsheetApp.getActiveSheet();

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    
    if (lastRow > 0 && lastColumn > 0) {
        const range = sheet.getRange(1, 1, lastRow, lastColumn);
        range.clear();
        sheet.clearContents();
        sheet.clearFormats();
        
        if (sheet.getFilter()) {
            sheet.getFilter().remove();
        }
    }
    const firstRecord = response.data['aliquot'][0];
    const headers = [];
    const flattenData = [];

    function extractFields(obj, prefix = '', result = {}) {
        for (let key in obj) {
            if (obj[key] !== null && typeof obj[key] === 'object') {
                if (Array.isArray(obj[key])) {
                    if (obj[key].length > 0 && typeof obj[key][0] === 'object') {
                        extractFields(obj[key][0], `${prefix}${key}_`, result);
                    } else {
                        result[`${prefix}${key}`] = obj[key].join(', ');
                    }
                } else {
                    extractFields(obj[key], `${prefix}${key}_`, result);
                }
            } else {
                result[`${prefix}${key}`] = obj[key];
            }
        }
        return result;
    }

    response.data['aliquot'].forEach(record => {
        const flatRecord = extractFields(record);
        flattenData.push(flatRecord);
        
        if (headers.length === 0) {
            headers.push(...Object.keys(flatRecord));
        }
    });

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f3f3f3');

    const values = flattenData.map(record => 
        headers.map(header => record[header] || '')
    );

    if (values.length > 0) {
        sheet.getRange(2, 1, values.length, headers.length).setValues(values);
        sheet.autoResizeColumns(1, headers.length);
    }

    const dataRange = sheet.getRange(1, 1, values.length + 1, headers.length);
    dataRange.setBorder(true, true, true, true, true, true);
}

function normalizeResponse(response) {
    let responseStr = typeof response === 'string' ? response : response.toString();
    
    responseStr = responseStr.replace(/=/g, ':');
    
    responseStr = responseStr.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    
    responseStr = responseStr.replace(/:(\s*)(PRJ[^,}\]]*)/g, ':"$2"');
    
    responseStr = responseStr.trim();
    
    Logger.log("Processed string: " + responseStr);
    
    return JSON.parse(responseStr);
}

function testNormalize() {
    const rawResponse = '{data={sample=[{subjects=[{submitter_id=PRJ161:M01}], submitter_id=PRJ161:L01}]}}';
    try {
        const normalized = normalizeResponse(rawResponse);
        Logger.log("Normalized JSON:");
        Logger.log(JSON.stringify(normalized, null, 2));
    } catch (error) {
        Logger.log("Error during normalization:");
        Logger.log(error);
    }
}


//  * Creates a new sheet named "Upload_Metadata_Sheet" and sets the header row.
//  */
function createUploadMetadataSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = "Upload_Metadata_Sheet"; 

  const headers = [
    "file_name",
    "project",
    "type",
    "submitter_id"
    // "file_size",
    // "file_source_repository",
    // "data_category",
    // "data_format",
    // "data_type",
    // "object_id",
    // "state_comments"
  ];

  let newSheet = spreadsheet.getSheetByName(sheetName);

  if (newSheet) {
    spreadsheet.setActiveSheet(newSheet);
    // SpreadsheetApp.getUi().alert(`The "${sheetName}" sheet already exists and has been activated.`);
    return;
  }

  newSheet = spreadsheet.insertSheet(sheetName); 

  const headerRange = newSheet.getRange(1, 1, 1, headers.length);

  headerRange.setValues([headers]); // setValues need a two dimentional array

  headerRange.setFontWeight('bold');
  headerRange.setBackground('#f3f3f3');

  newSheet.autoResizeColumns(1, headers.length);

  spreadsheet.setActiveSheet(newSheet);

  SpreadsheetApp.getUi().alert(`The new "${sheetName}" sheet has been created.`);
}

function openFileUploadDialog() {
  var template = HtmlService.createTemplateFromFile('FileUploadDialog');
  var htmlOutput = template.evaluate()
    .setWidth(500)
    .setHeight(400);
  
  SpreadsheetApp.getUi()
    .showModalDialog(htmlOutput, ' Upload File to Google Drive');
}

// function uploadFileToDrive(fileData, fileName, mimeType) {
//   try {
//     // Convert base64 data to blob
//     var blob = Utilities.newBlob(
//       Utilities.base64Decode(fileData), 
//       mimeType, 
//       fileName
//     );
    
//     // Upload to Google Drive root directory (you can modify for specific folder)
//     var file = DriveApp.createFile(blob);
    
//     // Return file information
//     return {
//       success: true,
//       fileId: file.getId(),
//       fileName: file.getName(),
//       fileUrl: file.getUrl(),
//       message: 'File uploaded successfully!'
//     };
    
//   } catch (error) {
//     return {
//       success: false,
//       message: 'Upload failed: ' + error.toString()
//     };
//   }
// }

// // 4. Optional: Upload to specific folder
// function uploadFileToSpecificFolder(fileData, fileName, mimeType, folderName) {
//   try {
//     var blob = Utilities.newBlob(
//       Utilities.base64Decode(fileData), 
//       mimeType, 
//       fileName
//     );
    
//     // Find or create folder
//     var folders = DriveApp.getFoldersByName(folderName);
//     var folder;
    
//     if (folders.hasNext()) {
//       folder = folders.next();
//     } else {
//       folder = DriveApp.createFolder(folderName);
//     }
    
//     // Create file in specified folder
//     var file = folder.createFile(blob);
    
//     return {
//       success: true,
//       fileId: file.getId(),
//       fileName: file.getName(),
//       fileUrl: file.getUrl(),
//       folderId: folder.getId(),
//       message: 'File uploaded to folder: ' + folderName
//     };
    
//   } catch (error) {
//     return {
//       success: false,
//       message: 'Upload failed: ' + error.toString()
//     };
//   }
// }

function downloadActiveSheet() {
  try {
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var activeSheet = spreadsheet.getActiveSheet();
    var ui = SpreadsheetApp.getUi();
    
    let node = PropertiesService.getScriptProperties().getProperty("node");
    let study = PropertiesService.getScriptProperties().getProperty("study");
    let project = PropertiesService.getScriptProperties().getProperty("project");
    
    var fileName;
    var currentSheetName = activeSheet.getName();
    
    if (project && study && node) {
      if (currentSheetName === "Upload_Metadata_Sheet") {
        study = study.split("-")[0];
        project = project.split("-")[0];
        fileName = project + "-" + study + "-datafile.tsv";
      } else {
        node = node.split("-")[0];
        study = study.split("-")[0];
        project = project.split("-")[0];
        
        fileName = project + "-" + study + "-" + node + ".tsv";
      }
    } else {
      var response = ui.prompt(
        'Custom File Name',
        'Project, Study, or Node information is missing.\nPlease enter a file name (without .tsv extension):',
        ui.ButtonSet.OK_CANCEL
      );
      
      if (response.getSelectedButton() == ui.Button.OK) {
        var customName = response.getResponseText().trim();
        
        if (customName === '') {
          ui.alert('Error', 'File name cannot be empty. Using sheet name as default.', ui.ButtonSet.OK);
          fileName = currentSheetName + '.tsv';
        } else {
          customName = customName.replace(/\.tsv$/i, '');
          fileName = customName + '.tsv';
        }
      } else {
        ui.alert('Cancelled', 'Download cancelled. No file was created.', ui.ButtonSet.OK);
        return {
          success: false,
          message: 'Download cancelled by user.'
        };
      }
    }
    
    var url = "https://docs.google.com/spreadsheets/d/" + spreadsheet.getId() + 
              "/export?format=tsv&gid=" + activeSheet.getSheetId();
    
    var token = ScriptApp.getOAuthToken();
    var response = UrlFetchApp.fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    
    var blob = response.getBlob()
                       .setName(fileName)
                       .setContentType('text/tab-separated-values');
    
    var file = DriveApp.createFile(blob);
    
    ui.alert('Success', 
             'Sheet has been saved to Google Drive!\n\n' +
             'File name: ' + fileName + '\n' +
             'File URL: ' + file.getUrl(), 
             ui.ButtonSet.OK);
    
    return {
      success: true,
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: file.getUrl(),
      message: 'Sheet downloaded successfully!'
    };
    
  } catch (error) {
    var ui = SpreadsheetApp.getUi();
    ui.alert('Error', 'Download failed: ' + error.toString(), ui.ButtonSet.OK);
    
    return {
      success: false,
      message: 'Download failed: ' + error.toString()
    };
  }
}