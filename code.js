function onOpen() {  
  var ui = SpreadsheetApp.getUi();
  DriveApp.getRootFolder();
  ui.createMenu('ToxDataCommons')
    .addItem('Create Gen3 Template', 'openTokenDialog')
    .addItem('Save as .tsv file', 'openSaveDialog')
    .addItem('Upload Metadata', 'createUploadMetadataSheet')
    .addItem('Authentication', 'openFileUploadDialog')
    .addToUi();
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

// Function to get the auth provider using the credentials JSON
// TODO: Try the following:
// 1. Set key as user property (user pastes json value) 
//   PropertiesService.getUserProperties().setProperty('token', 'abc123');
//   let token = PropertiesService.getUserProperties().getProperty('token');
// 2. Cache method (user pastes again
//   const cache = CacheService.getUserCache(); // or getScriptCache()
//   cache.put('mySessionKey', 'mySessionValue', 1800); // Expires in 30 min
//   let val = cache.get('mySessionKey');
// 3. Set as fixed drive path (e.g., must be gdrive://gen3creds/credentials.json)

// function getAuthProvider() {
//   try {
//     const fileId = '15QBC5TA9Hg7fVat-Xjra_cr6xAV6L0Wi'; //keji dev.toxdatacommon
//     // const fileId = '12PhJxjN3fLofYOjGxqYuMVuA2TTeSh2i'; //keji
//     // const fileId = '1_hF1BLLni4ipHiPld77L6EcIEu2TA0pu'; 

//     let file;
//     try {
//       file = DriveApp.getFileById(fileId);
//       Logger.log(file.getName())
//       // SpreadsheetApp.getUi().alert(file.getName())
//       // SpreadsheetApp.getUi().alert(`file:  ${JSON.stringify(file)}`)
//     } catch (e) {
//       Logger.log('The file specified cannot be found. Please check if the file ID is correct.');
//       Logger.log('Current file id: ' + fileId);
//       throw new Error('File access failed 111:' + e.message);
//     }

//     try {
//       const content = file.getBlob().getDataAsString();
//       // SpreadsheetApp.getUi().alert(JSON.stringify(content))
//       // Logger.log(JSON.stringify(content))
//       const jsonData = JSON.parse(content);
      
//       if (!jsonData.api_key || !jsonData.key_id) {
//         throw new Error('Credentials file is missing a required field (api_key or key_id)');
//       }
//       // Logger.log(JSON.stringify(jsonData))
//       // SpreadsheetApp.getUi().alert(JSON.stringify(jsonData))
//       return {
//         endpoint: "https://dev.toxdatacommons.com",
//         accessToken: jsonData.api_key,
//         keyId: jsonData.key_id
//       };
//     } catch (e) {
//       Logger.log('Parsing of file content failed. Please make sure the file contains valid JSON data');
//       throw new Error('File format error:' + e.message);
//     }
//   } catch (error) {
//     Logger.log('Error Detail：' + error.toString());
//     throw error;
//   }
// }

// Function to get access token using refresh token
function getAccessToken(authProvider) {
    const url = `${authProvider.endpoint}/user/credentials/cdis/access_token`;
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
        // SpreadsheetApp.getUi().alert(authProvider.keyId)
        // SpreadsheetApp.getUi().alert(JSON.stringify(authProvider))
        // SpreadsheetApp.getUi().alert(response.getResponseCode())
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

// TODO: Move Gen3-SDK functions into jsGen3-SDK.js
// Function to execute a GraphQL query
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

// Function to fetch subject data and render it in Google Sheets
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