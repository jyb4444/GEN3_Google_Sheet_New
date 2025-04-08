function onOpen() {  
  var ui = SpreadsheetApp.getUi();
  DriveApp.getRootFolder();
  ui.createMenu('Gen3')
    .addItem('Create Gen3 Template', 'openTokenDialog')
    .addToUi();
}

function authorizeScript() {
  // SpreadsheetApp.getUi().alert("authorizeScript")
  const rootFolder = DriveApp.getRootFolder();
  Logger.log("Root folder name: " + rootFolder.getName());
  // SpreadsheetApp.getUi().alert(rootFolder.getName())
  
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("Spreadsheet name: " + sheet.getName());
  // SpreadsheetApp.getUi().alert(sheet.getName())
}

// Main function to open the dialog and request the toke
function openTokenDialog() {
  const projectData = fetchProjectList();
  const studyData = fetchStudyList();
  const targetNodeData = JSON.parse(fetchTargetNodeList());
  const key = Object.keys(targetNodeData.data)[0];
  const nodetypes = targetNodeData.data[key].map((ele) => ele.id)

  var template = HtmlService.createTemplateFromFile('TokenDialog');
  template.projectData = projectData;  
  template.studyData = studyData;
  template.targetNodeData = JSON.stringify(nodetypes);
  
  var htmlOutput = template.evaluate()
    .setWidth(400)
    .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Toxdatacommons Update/Create');
}

// function checkFileAccess() {
//   try {
//     const fileId = '12PhJxjN3fLofYOjGxqYuMVuA2TTeSh2i';
//     const file = DriveApp.getFileById(fileId);
//     // 尝试获取文件名而不是序列化整个对象
//     Logger.log(`文件名: ${file.getName()}, 文件大小: ${file.getSize()}`);
//   } catch (e) {
//     Logger.log('文件访问错误: ' + e.message);
//   }
// }

// Function to get the auth provider using the credentials JSON
function getAuthProvider() {
  try {
    const fileId = '12PhJxjN3fLofYOjGxqYuMVuA2TTeSh2i'; //keji
    // const fileId = '1_hF1BLLni4ipHiPld77L6EcIEu2TA0pu'; 

    let file;
    try {
      file = DriveApp.getFileById(fileId);
      Logger.log(file.getName())
      // SpreadsheetApp.getUi().alert(file.getName())
      // SpreadsheetApp.getUi().alert(`file:  ${JSON.stringify(file)}`)
    } catch (e) {
      Logger.log('The file specified cannot be found. Please check if the file ID is correct.');
      Logger.log('Current file id: ' + fileId);
      throw new Error('File access failed 111:' + e.message);
    }

    try {
      const content = file.getBlob().getDataAsString();
      // SpreadsheetApp.getUi().alert(JSON.stringify(content))
      // Logger.log(JSON.stringify(content))
      const jsonData = JSON.parse(content);
      
      if (!jsonData.api_key || !jsonData.key_id) {
        throw new Error('Credentials file is missing a required field (api_key or key_id)');
      }
      // Logger.log(JSON.stringify(jsonData))
      // SpreadsheetApp.getUi().alert(JSON.stringify(jsonData))
      return {
        endpoint: "https://toxdatacommons.com",
        accessToken: jsonData.api_key,
        keyId: jsonData.key_id
      };
    } catch (e) {
      Logger.log('Parsing of file content failed. Please make sure the file contains valid JSON data');
      throw new Error('File format error:' + e.message);
    }
  } catch (error) {
    Logger.log('Error Detail：' + error.toString());
    throw error;
  }
}

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
        Logger.log(authProvider)
        Logger.log(url)
        if (response.getResponseCode() === 200) {
            const tokenData = JSON.parse(response.getContentText());
            return tokenData.access_token;
        } else {
            throw new Error("Failed to get access token");
        }
    } catch (error) {
        Logger.log("Token Error: " + error.toString());
        throw error;
    }
}

// function executeGraphQLQuery(authProvider, queryString) {
//   const accessToken = getAccessToken(authProvider)
//   const url = `${authProvider.endpoint}/guppy/graphql`; 

//   const payload = {
//     query: queryString
//   };

//   const options = {
//     method: 'POST',
//     contentType: 'application/json',
//     headers: {
//       'Authorization': `Bearer ${accessToken}`,
//       'Content-Type': 'application/json' 
//     },
//     payload: JSON.stringify(payload),
//     muteHttpExceptions: true
//   };

//   const response = UrlFetchApp.fetch(url, options);

//   if (response.getResponseCode() === 200) {
//     const rawResponse = response.getContentText();
//     const normalizedData = normalizeResponse(rawResponse);
//     return JSON.stringify(normalizedData, null, 2)
//   } else {
//     Logger.log("Error: " + response.getContentText());
//     throw new Error("GraphQL query failed with status: " + response.getResponseCode());
//   }
// }

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
