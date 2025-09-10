function fetchProjectList() {
  const authProvider = getAuthProvider();
  
  const queryTxt = `{
    project {
      description
      project_id
      code
    }
  }`;

  try {
    const response = executeGraphQLQuery(authProvider, queryTxt);
    
    return response;
  } catch (error) {
    Logger.log("Error fetching project list: " + error);
    throw error;
  }
}

function fetchStudyList() {
  const authProvider = getAuthProvider();

  const queryTxt = `{
    study (first: 10) {
      submitter_id
      study_description
      projects {
        code
      }
    }	
  }`;

  try {
    const response = executeGraphQLQuery(authProvider, queryTxt);
    return response;
  } catch (error) {
    Logger.log("Error fetching study list: " + error);
    throw error;
  }
}

function filteredStudy(studyList, projectId){
  try{
    const project_id = projectId.split("-")[1];
    const filteredStudies = studyList.data.study.filter(study => {
      return study.projects.some(project => project.code === project_id);
    });

    return filteredStudies;
  }catch(error){
    Logger.log("Error filtering study list: " + error);
    throw error;
  }
}

// This function runs a GraphQL query to get the names of each node 
// use to populate the dialog box. It also includes the description.
function fetchTargetNodeList(){
  const authProvider = getAuthProvider();

  const queryTxt = `{
    _node_type(first: 100) {
      id
      title
      description
      category
    }
  }`

  try {
    const response = executeGraphQLQuery(authProvider, queryTxt);
    return response;
  }catch (error) {
    Logger.log("Error fecthing target node list: " + error);
    throw error;
  }
}

function fetchDataByNode(node) {
  const authProvider = getAuthProvider();
  const url = `${authProvider.endpoint}/api/v0/submission/_dictionary/${node}`; 

  const options = {
    method: 'GET',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${authProvider.accessToken}`,
      'Content-Type': 'application/json' 
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);

  renderAdditionalPropertiesToSheet(JSON.parse(response));
}

// TODO: Move to guppy_query.js? Seems to fit better there.
function getNodeDictionary(node="treatment") {
  try {
    const authProvider = getAuthProvider();
    node = node.split("-")[0]
    const url = `${authProvider.endpoint}/api/v0/submission/_dictionary/${node}`;

    const options = {
      method: 'GET',
      contentType: 'application/json',
      headers: {
        'Authorization': `Bearer ${authProvider.accessToken}`,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode !== 200) {
      throw new Error(`API request failed with status code: ${responseCode}`);
    }
    
    const jsonResponse = JSON.parse(response.getContentText());
    
    return jsonResponse;
  } catch (error) {
    console.error(`Error in getNodeDictionary: ${error.message}`);
    throw new Error(`Failed to get node dictionary: ${error.message}`);
  }
}

function getAllNode(){
  const authProvider = getAuthProvider();
  const url = `${authProvider.endpoint}/api/v0/submission/_dictionary/_all`;

  const options = {
    method: 'GET',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${authProvider.accessToken}`,
      'Content-Type': 'application/json' 
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);

  return response;
}

function saveToS3() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();

    let node = PropertiesService.getScriptProperties().getProperty("node");
    let study = PropertiesService.getScriptProperties().getProperty("study");
    let project = PropertiesService.getScriptProperties().getProperty("project");

    if(!node){
      SpreadsheetApp.getUi().alert("Please check whether you select the node.")
      return;
    }

    if(!study){
      SpreadsheetApp.getUi().alert("Please check whether you select the study.")
      return;
    }
    
    if(!project){
      SpreadsheetApp.getUi().alert("Please check whether you select the project.")
      return;
    }

    var currentSheetName = sheet.getName();
    var fileName;

    if (currentSheetName === "Upload_Metadata_Sheet") {
      study = study.split("-")[0];
      project = project.split("-")[0];
      fileName = project + "-" + study + "-datafile.tsv";
    } else {
      var validationResult = validateRequiredColumns(node, values);
      if (!validationResult.isValid) {
        SpreadsheetApp.getUi().alert(validationResult.message);
        return;
      }
      
      node = node.split("-")[0];
      study = study.split("-")[0];
      project = project.split("-")[0];
      
      const sheetName = project + "-" + study + "-" + node;
      fileName = sheetName + ".tsv";
    }

    var tsvData = values.map(function(row) {
      return row.join('\t');
    }).join('\n');

    var presignUrl = "https://9ncr8ht0n1.execute-api.us-east-1.amazonaws.com/presign";
    var presignPayload = {
      "filename": fileName,
      "contentType": "text/tab-separated-values",
      "token": "thisisalongsecret"  
    };

    var presignOptions = {
      'method': 'POST',
      'headers': {
        'Content-Type': 'application/json'
      },
      'payload': JSON.stringify(presignPayload)
    };

    Logger.log("Requesting presigned URL for: " + fileName);
    var presignResponse = UrlFetchApp.fetch(presignUrl, presignOptions);
    
    if (presignResponse.getResponseCode() !== 200) {
      throw new Error("Failed to get presigned URL: " + presignResponse.getContentText());
    }

    var presignData = JSON.parse(presignResponse.getContentText());
    Logger.log("Received presigned URL: " + presignData.url);

    var uploadOptions = {
      'method': 'PUT',
      'headers': {
        'Content-Type': 'text/tab-separated-values'
      },
      'payload': tsvData
    };

    Logger.log("Uploading file to S3...");
    var uploadResponse = UrlFetchApp.fetch(presignData.url, uploadOptions);
    
    if (uploadResponse.getResponseCode() !== 200) {
      throw new Error("Failed to upload file to S3: " + uploadResponse.getContentText());
    }

    Logger.log("TSV file uploaded to S3 successfully: " + fileName);
    
    var s3FileUrl = "https://" + presignData.bucket + ".s3.us-east-1.amazonaws.com/" + presignData.key;
    
    return "TSV file '" + fileName + "' uploaded successfully to S3. File location: " + s3FileUrl;

  } catch (error) {
    Logger.log("Error uploading TSV file to S3: " + error);
    return "Error uploading TSV file to S3: " + error; 
  }
}

// function saveToGoogleDrive() {
//   try {
//     var ss = SpreadsheetApp.getActiveSpreadsheet();
//     var sheet = ss.getActiveSheet();
//     var dataRange = sheet.getDataRange();
//     var values = dataRange.getValues();

//     let node = PropertiesService.getScriptProperties().getProperty("node");
//     let study = PropertiesService.getScriptProperties().getProperty("study");
//     let project = PropertiesService.getScriptProperties().getProperty("project");

//     if(!node){
//       SpreadsheetApp.getUi().alert("Please check whether you select the node.")
//       return;
//     }

//     if(!study){
//       SpreadsheetApp.getUi().alert("Please check whether you select the study.")
//       return;
//     }
    
//     if(!project){
//       SpreadsheetApp.getUi().alert("Please check whether you select the project.")
//       return;
//     }

//     var currentSheetName = sheet.getName();
//     var fileName;

//     if (currentSheetName === "Upload_Metadata_Sheet") {
//       study = study.split("-")[0];
//       project = project.split("-")[0];
//       fileName = project + "-" + study + "-datafile.tsv";
//     } else {
//       var validationResult = validateRequiredColumns(node, values);
//       if (!validationResult.isValid) {
//         SpreadsheetApp.getUi().alert(validationResult.message);
//         return;
//       }
      
//       node = node.split("-")[0];
//       study = study.split("-")[0];
//       project = project.split("-")[0];
      
//       const sheetName = project + "-" + study + "-" + node;
//       fileName = sheetName + ".tsv";
//     }

//     var tsvData = values.map(function(row) {
//       return row.join('\t');
//     }).join('\n');

//     var blob = Utilities.newBlob(tsvData, "text/tab-separated-values", fileName);

//     var file = DriveApp.createFile(blob);

//     var fileUrl = file.getUrl();
//     Logger.log("TSV file saved to Drive: " + fileUrl);
//     return "TSV file '" + fileName + "' saved successfully to your Google Drive. You can find it here: " + fileUrl;

//   } catch (error) {
//     Logger.log("Error saving TSV file: " + error);
//     return "Error saving TSV file: " + error; 
//   }
// }

function validateRequiredColumns(node, values) {
  try {
    const nodeInfo = getNodeDictionary(node);
    if (!nodeInfo || !nodeInfo.required) {
      return {isValid: true}; 
    }

    if (values.length === 0) {
      return {
        isValid: false,
        message: "Sheet is empty. Cannot validate required columns."
      };
    }

    const headers = values[0];
    let requiredColumns = nodeInfo.required.slice();
    const submitterIdIndex = requiredColumns.indexOf('submitter_id');
    if (submitterIdIndex !== -1) {
      requiredColumns.splice(submitterIdIndex, 1);
    }


    var missingColumns = [];
    for (var i = 0; i < requiredColumns.length; i++) {
      var requiredCol = requiredColumns[i];
      if (headers.indexOf(requiredCol) === -1) {
        missingColumns.push(requiredCol);
      }
    }

    if (missingColumns.length > 0) {
      return {
        isValid: false,
        message: "Missing required columns: " + missingColumns.join(", ") + 
                ". Please add these columns to your sheet."
      };
    }

    var emptyValueErrors = [];
    
    for (var i = 0; i < requiredColumns.length; i++) {
      var requiredCol = requiredColumns[i];
      var colIndex = headers.indexOf(requiredCol);
      
      if (colIndex !== -1) {
        for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
          var cellValue = values[rowIndex][colIndex];
          
          if (cellValue === null || cellValue === undefined || 
              String(cellValue).trim() === "") {
            emptyValueErrors.push({
              column: requiredCol,
              row: rowIndex + 1 
            });
          }
        }
      }
    }

    if (emptyValueErrors.length > 0) {
      var errorsByColumn = {};
      emptyValueErrors.forEach(function(error) {
        if (!errorsByColumn[error.column]) {
          errorsByColumn[error.column] = [];
        }
        errorsByColumn[error.column].push(error.row);
      });

      var errorMessage = "Required columns cannot be empty:\n";
      Object.keys(errorsByColumn).forEach(function(column) {
        var rows = errorsByColumn[column];
        errorMessage += "- Column '" + column + "' has empty values in row(s): " + 
                       rows.join(", ") + "\n";
      });

      return {
        isValid: false,
        message: errorMessage
      };
    }

    return {isValid: true};

  } catch (error) {
    Logger.log("Error in validation: " + error);
    return {
      isValid: false,
      message: "Validation error: " + error
    };
  }
}