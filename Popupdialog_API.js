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
    study (first: 1000) {
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

function getProjectFromSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  const headers = data[0];
  const projectColIndex = headers.findIndex(h => 
    h.toString().toLowerCase().trim() === 'project'
  );
  
  if (projectColIndex === -1) {
    throw new Error('Project column not found in the sheet');
  }
  
  for (let i = 1; i < data.length; i++) {
    const projectValue = data[i][projectColIndex];
    if (projectValue && projectValue.toString().trim() !== '') {
      return projectValue.toString().trim();
    }
  }
  
  throw new Error('No project value found in the sheet');
}

function getProgramByProject(project) {
  try {
    const authProvider = getAuthProvider();
    const query = new Gen3Query(authProvider);
    
    const queryString = `query {
      project(code: "${project}") {
        code
        programs {
          name
        }
      }
    }`;
    
    const response = query.graphqlQuery(authProvider, queryString);
    
    if (response && response.data && response.data.project && response.data.project.length > 0) {
      const projectData = response.data.project[0];
      if (projectData.programs && projectData.programs.length > 0) {
        return projectData.programs[0].name;
      }
    }
    
    throw new Error(`Program not found for project: ${project}`);
    
  } catch (error) {
    Logger.log('Error getting program: ' + error.toString());
    throw new Error('Failed to get program for project ' + project + ': ' + error.toString());
  }
}

function generateTsvFileName() {
  try {
    const node = PropertiesService.getScriptProperties().getProperty("node");
    const timestamp = getTimestamp();
    
    if (!node) {
      throw new Error('Node not set');
    }
    
    const nodeClean = node.split("-")[0];
    return `${nodeClean}_${timestamp}.tsv`;
    
  } catch (error) {
    Logger.log('Error generating TSV filename: ' + error.toString());

    const timestamp = getTimestamp();
    return `submission_${timestamp}.tsv`;
  }
}

function getExpectedFileNames() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Upload_Metadata_Sheet');
  
  if (!sheet) {
    throw new Error('Upload_Metadata_Sheet not found');
  }
  
  const data = sheet.getDataRange().getValues();
  const fileNameColIndex = 0; // 列 A
  
  const fileNames = [];
  for (let i = 1; i < data.length; i++) {
    const fileName = data[i][fileNameColIndex];
    if (fileName) {
      fileNames.push(fileName.toString().trim());
    }
  }
  
  return fileNames;
}

function validateUploadedFiles(uploadedFiles) {
  const expectedFiles = getExpectedFileNames();
  const uploadedNames = uploadedFiles.map(f => f.name);
  
  const missingFiles = expectedFiles.filter(name => !uploadedNames.includes(name));
  const extraFiles = uploadedNames.filter(name => !expectedFiles.includes(name));
  
  if (missingFiles.length > 0 || extraFiles.length > 0) {
    let message = 'File validation failed:\n\n';
    
    if (missingFiles.length > 0) {
      message += 'Missing files:\n' + missingFiles.join('\n') + '\n\n';
    }
    
    if (extraFiles.length > 0) {
      message += 'Unexpected files:\n' + extraFiles.join('\n');
    }
    
    return {
      valid: false,
      message: message,
      files: null
    };
  }
  
  const timestamp = getTimestamp();
  const filesWithTimestamp = uploadedFiles.map(file => ({
    ...file,
    nameWithTimestamp: addTimestampToFileName(file.name, timestamp)
  }));
  
  return {
    valid: true,
    message: 'All files validated successfully',
    files: filesWithTimestamp
  };
}

function getTimestamp() {
  const now = new Date();

  const pad = n => String(n).padStart(2, "0");

  const year   = now.getFullYear();
  const month  = pad(now.getMonth() + 1);
  const day    = pad(now.getDate());
  const hour   = pad(now.getHours());
  const minute = pad(now.getMinutes());

  return `${year}${month}${day}${hour}${minute}`;
}

function addTimestampToFileName(fileName, timestamp) {
  const lastDotIndex = fileName.lastIndexOf('.');
  
  if (lastDotIndex === -1) {
    return `${timestamp}-${fileName}`;
  }
  
  const nameWithoutExt = fileName.substring(0, lastDotIndex);
  const extension = fileName.substring(lastDotIndex);
  return `${nameWithoutExt}_${timestamp}${extension}`;
}

function submitFilesToS3(filesData) {
  try {
    const validation = validateUploadedFiles(filesData);
    
    if (!validation.valid) {
      return {
        success: false,
        message: validation.message
      };
    }
    
    const study = PropertiesService.getScriptProperties().getProperty("study");
    const project = PropertiesService.getScriptProperties().getProperty("project");
    const program = getProgramByProject(project);
    
    if (!study || !project || !program) {
      return {
        success: false,
        message: 'Missing required information: program, project, or study'
      };
    }
    
    const studyClean = study.split("-")[0];
    const projectClean = project.split("-")[0];
    
    const uploadResults = [];
    const timestamp = getTimestamp();
    
    Logger.log('Step 1: Uploading user files to upload-files/ path');
    
    validation.files.forEach(file => {
      try {
        const s3KeyForDataFile = `upload-files/${program}/${projectClean}/${studyClean}/${file.nameWithTimestamp}`;
        Logger.log(`Uploading data file: ${s3KeyForDataFile}`);
        
        const fileContent = Utilities.base64Decode(file.content);
        
        uploadToS3(s3KeyForDataFile, fileContent, file.mimeType);
        
        uploadResults.push({
          fileName: file.name,
          newFileName: file.nameWithTimestamp,
          s3Key: s3KeyForDataFile,
          success: true
        });
        
        Logger.log(`Successfully uploaded: ${file.nameWithTimestamp}`);
        
      } catch (error) {
        Logger.log(`Error uploading ${file.name}: ${error.toString()}`);
        uploadResults.push({
          fileName: file.name,
          success: false,
          error: error.toString()
        });
      }
    });
    
    const failedUploads = uploadResults.filter(r => !r.success);
    
    if (failedUploads.length > 0) {
      return {
        success: false,
        message: `Failed to upload ${failedUploads.length} file(s) to S3:\n` + 
                 failedUploads.map(f => f.fileName).join('\n')
      };
    }
    
    Logger.log('Step 2: Generating and uploading datafile.tsv');
    
    try {
      const datafileTsv = generateDatafileTsv(uploadResults);
      
      const datafileName = `${timestamp}-datafile.tsv`;
      
      const datafileTsvKey = `uploads/${program}/${projectClean}/${studyClean}/${datafileName}`;
      Logger.log(`Uploading ${datafileName} to: ${datafileTsvKey}`);
      
      uploadToS3(datafileTsvKey, datafileTsv, 'text/tab-separated-values');
      
      Logger.log(`Successfully uploaded ${datafileName}`);
      
    } catch (error) {
      Logger.log('Error uploading datafile.tsv: ' + error.toString());
      return {
        success: false,
        message: 'Failed to upload datafile.tsv: ' + error.toString()
      };
    }
    
    const fileNames = uploadResults.map(r => r.newFileName).join(', ');
    
    return {
      success: true,
      message: `Successfully uploaded:\n` +
               `- ${uploadResults.length} data file(s): ${fileNames}\n` +
               `- datafile_${timestamp}.tsv manifest\n\n` +
               `S3 Paths:\n` +
               `- Data files: upload-files/${program}/${projectClean}/${studyClean}/\n` +
               `- Manifest: uploads/${program}/${projectClean}/${studyClean}/datafile_${timestamp}.tsv`
    };
    
  } catch (error) {
    Logger.log('Error in submitFilesToS3: ' + error.toString());
    return {
      success: false,
      message: 'Upload failed: ' + error.toString()
    };
  }
}

function generateDatafileTsv(uploadResults) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Upload_Metadata_Sheet');
  
  if (!sheet) {
    throw new Error('Upload_Metadata_Sheet not found');
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const fileNameIdx = headers.findIndex(h => h.toString().toLowerCase().trim() === 'file_name');
  const projectIdx = headers.findIndex(h => h.toString().toLowerCase().trim() === 'project');
  const typeIdx = headers.findIndex(h => h.toString().toLowerCase().trim() === 'type');
  const submitterIdIdx = headers.findIndex(h => h.toString().toLowerCase().trim() === 'submitter_id');
  
  if (fileNameIdx === -1 || projectIdx === -1 || typeIdx === -1 || submitterIdIdx === -1) {
    throw new Error('Upload_Metadata_Sheet missing required columns: file_name, project, type, submitter_id');
  }
  
  const fileNameMap = {};
  uploadResults.forEach(result => {
    fileNameMap[result.fileName] = result.newFileName;
  });
  
  const tsvLines = [];
  
  tsvLines.push('file_name\tproject\ttype\tsubmitter_id\tguid');
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    if (!row[fileNameIdx]) continue;
    
    const originalFileName = row[fileNameIdx].toString().trim();
    const newFileName = fileNameMap[originalFileName] || originalFileName;
    const project = row[projectIdx].toString().trim();
    const type = row[typeIdx].toString().trim();
    const submitterId = row[submitterIdIdx].toString().trim();
    const guid = ''; 
    
    tsvLines.push(`${newFileName}\t${project}\t${type}\t${submitterId}\t${guid}`);
  }
  
  return tsvLines.join('\n');
}

function uploadToS3(s3Key, content, contentType) {
  const savedBucket = PropertiesService.getScriptProperties().getProperty('CURRENT_TARGET_BUCKET');
  if(!savedBucket){
    SpreadsheetApp.getUi().alert("You need to choose correct profile.");
    return;
  }
  const presignUrl = "https://9ncr8ht0n1.execute-api.us-east-1.amazonaws.com/presign";
  const presignPayload = {
    "bucket": savedBucket,
    "key": s3Key,
    "contentType": contentType,
    "token": "thisisalongsecret"
  };
  
  const presignOptions = {
    'method': 'POST',
    'headers': {
      'Content-Type': 'application/json'
    },
    'payload': JSON.stringify(presignPayload),
    'muteHttpExceptions': true
  };
  
  Logger.log("Requesting presigned URL for: " + s3Key);
  const presignResponse = UrlFetchApp.fetch(presignUrl, presignOptions);
  // SpreadsheetApp.getUi().alert("upload real files response: \n", presignResponse)
  if (presignResponse.getResponseCode() !== 200) {
    throw new Error("Failed to get presigned URL: " + presignResponse.getContentText());
  }
  
  const presignData = JSON.parse(presignResponse.getContentText());
  Logger.log("Received presigned URL");
  
  const uploadOptions = {
    'method': 'PUT',
    'headers': {
      'Content-Type': contentType
    },
    'payload': content,
    'muteHttpExceptions': true
  };
  
  Logger.log("Uploading to S3...");
  const uploadResponse = UrlFetchApp.fetch(presignData.url, uploadOptions);
  
  if (uploadResponse.getResponseCode() !== 200) {
    throw new Error("Failed to upload to S3: " + uploadResponse.getContentText());
  }
  
  Logger.log("Successfully uploaded to S3: " + s3Key);
  
  return {
    bucket: presignData.bucket,
    key: presignData.key,
    url: `https://${presignData.bucket}.s3.us-east-1.amazonaws.com/${presignData.key}`
  };
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
    
    let program;
    try {
      program = getProgramByProject(project);
    } catch (error) {
      Logger.log("Error getting program: " + error.toString());
      program = null;
    }

    if (!study) {
      const headers = values[0];

      const studyColIndex = headers.indexOf("study.submitter_id");

      if (studyColIndex === -1) {
        SpreadsheetApp.getUi().alert(
          "study is not selected and column 'study.submitter_id' was not found."
        );
        return;
      }

      for (let i = 1; i < values.length; i++) {
        const cellValue = values[i][studyColIndex];
        if (cellValue && String(cellValue).trim() !== "") {
          study = String(cellValue).trim();
          break;
        }
      }

      if (!study) {
        SpreadsheetApp.getUi().alert(
          "study is not selected and no valid value found in 'study.submitter_id' column."
        );
        return;
      }
    }

    if (!node) {
      SpreadsheetApp.getUi().alert("Please check whether you select the node.");
      return;
    }

    if (!study) {
      SpreadsheetApp.getUi().alert("Please check whether you select the study.");
      return;
    }
    
    if (!project) {
      SpreadsheetApp.getUi().alert("Please check whether you select the project.");
      return;
    }

    if (!program) {
      SpreadsheetApp.getUi().alert("Please check whether you query a program.");
      return;
    }

    var validationResult = validateRequiredColumns(node, values);
    if (!validationResult.isValid) {
      SpreadsheetApp.getUi().alert(validationResult.message);
      return;
    }
    
    node = node.split("-")[0];
    study = study.split("-")[0];
    project = project.split("-")[0];
    
    var timestamp = getTimestamp();
    var fileName = timestamp + "-" + node + ".tsv";

    var s3Key = "uploads/" + program + "/" + project + "/" + study + "/" + fileName;

    var tsvData = values.map(function(row) {
      return row.join('\t');
    }).join('\n');

    const savedBucket = PropertiesService.getScriptProperties().getProperty('CURRENT_TARGET_BUCKET');
    if(!savedBucket){
      SpreadsheetApp.getUi().alert("You need to choose correct profile.");
      return;
    }

    var presignUrl = "https://9ncr8ht0n1.execute-api.us-east-1.amazonaws.com/presign";
    
    var presignPayload = {
      "bucket": savedBucket,
      "key": s3Key,
      "contentType": "text/tab-separated-values",
      "token": "thisisalongsecret"
    };

    var presignOptions = {
      'method': 'POST',
      'headers': {
        'Content-Type': 'application/json'
      },
      'payload': JSON.stringify(presignPayload),
      'muteHttpExceptions': true
    };

    Logger.log("Requesting presigned URL for: " + fileName);
    var presignResponse = UrlFetchApp.fetch(presignUrl, presignOptions);
    // SpreadsheetApp.getUi().alert(presignResponse)
    if (presignResponse.getResponseCode() !== 200) {
      throw new Error("Failed to get presigned URL: " + presignResponse.getContentText());
    }

    var presignData = JSON.parse(presignResponse.getContentText());
    Logger.log("Received presigned URL");

    var uploadOptions = {
      'method': 'PUT',
      'headers': {
        'Content-Type': 'text/tab-separated-values'
      },
      'payload': tsvData,
      'muteHttpExceptions': true
    };

    Logger.log("Uploading file to S3...");
    var uploadResponse = UrlFetchApp.fetch(presignData.url, uploadOptions);
    
    if (uploadResponse.getResponseCode() !== 200) {
      throw new Error("Failed to upload file to S3: " + uploadResponse.getContentText());
    }

    Logger.log("TSV file uploaded to S3 successfully: " + fileName);
    
    var s3FileUrl = "https://" + presignData.bucket + ".s3.us-east-1.amazonaws.com/" + presignData.key;
    
    return "TSV file '" + fileName + "' uploaded successfully to S3.\n\nS3 Location: " + s3FileUrl;

  } catch (error) {
    Logger.log("Error uploading TSV file to S3: " + error);
    return "Error uploading TSV file to S3: " + error; 
  }
}

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

function saveTargetBucket(bucketName) {
  PropertiesService.getScriptProperties().setProperty('CURRENT_TARGET_BUCKET', bucketName);
  Logger.log('Global Bucket updated to: ' + bucketName);
}