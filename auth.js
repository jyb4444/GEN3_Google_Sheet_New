const ENV_CONFIG = {
  "https://dev.pvatppgmsu.com/": "msu-gen3-dev-pvatppgmsu-data",
  "https://data.pvatppgmsu.com/": "msu-gen3-prod-pvatppgmsu-data",
  "https://dev.toxdatacommons.com/": "msu-gen3-dev-toxdc-data",
  "https://toxdatacommons.com/": "msu-gen3-prod-toxdc-data"
}

// 1. Modify the processing function after successful upload and save the file ID
// function uploadFileToDrive(fileData=fileData1, fileName=fileName1, mimeType=mimeType1) {
function uploadFileToDrive(fileData, fileName, mimeType) {
  try {
    var blob = Utilities.newBlob(
      Utilities.base64Decode(fileData), 
      mimeType, 
      fileName
    );

    var file = DriveApp.createFile(blob);
    var fileId = file.getId();
    // If it is a credential file, save the ID to PropertiesService
    if (/credentials?/i.test(fileName)) {
      PropertiesService.getScriptProperties().deleteProperty('AUTH_FILE_ID');
      PropertiesService.getScriptProperties().setProperty('AUTH_FILE_ID', fileId);
      Logger.log('Auth file ID saved: ' + fileId);
      const current = PropertiesService.getScriptProperties().getProperty('AUTH_FILE_ID');
      Logger.log('Readback saved file ID: ' + current);
    } else {
      Logger.log("Skipped saving because file name does not include 'credential'");
    }


    
    return {
      success: true,
      fileId: fileId,
      fileName: file.getName(),
      fileUrl: file.getUrl(),
      message: 'File uploaded successfully!'
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'Upload failed: ' + error.toString()
    };
  }
}

// 2. getAuthProvider function to obtain the file ID from PropertiesService
function getAuthProvider() {
  try {
    const savedBucket = PropertiesService.getScriptProperties().getProperty('CURRENT_TARGET_BUCKET');
    const dynamicEndpoint = Object.keys(ENV_CONFIG).find((ele) => ENV_CONFIG[ele] === savedBucket);
    // SpreadsheetApp.getUi().alert(savedBucket)
    // SpreadsheetApp.getUi().alert(dynamicEndpoint)
    if(!dynamicEndpoint){
      SpreadsheetApp.getUi().alert("Please check your profile name")
      return;
    }

    // First try to get the saved file ID from PropertiesService
    let fileId = PropertiesService.getScriptProperties().getProperty('AUTH_FILE_ID');
    Logger.log(fileId)
    let file;
    try {
      file = DriveApp.getFileById(fileId);
      Logger.log(file.getName())
    } catch (e) {
      Logger.log('The file specified cannot be found. Please check if the file ID is correct.');
      Logger.log('Current file id: ' + fileId);
      throw new Error('File access failed 111:' + e.message);
    }

    try {
      const content = file.getBlob().getDataAsString();
      const jsonData = JSON.parse(content);
      Logger.log(jsonData.key_id)
      if (!jsonData.api_key || !jsonData.key_id) {
        throw new Error('Credentials file is missing a required field (api_key or key_id)');
      }
      
      return {
        endpoint: dynamicEndpoint,
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

// 3. Add a function to manually set the file ID
function setAuthFileId(fileId) {
  PropertiesService.getScriptProperties().setProperty('AUTH_FILE_ID', fileId);
  Logger.log('Auth file ID manually set to: ' + fileId);
}

// 4. Add a function to get the ID of the currently saved file
function getCurrentAuthFileId() {
  const fileId = PropertiesService.getScriptProperties().getProperty('AUTH_FILE_ID');
  Logger.log('Current saved auth file ID: ' + fileId);
  return fileId;
}

// 5. Add a function to clear the saved file ID
function clearAuthFileId() {
  PropertiesService.getScriptProperties().deleteProperty('AUTH_FILE_ID');
  Logger.log('Auth file ID cleared');
}

function clearSpecificProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();

  scriptProperties.deleteProperty("node");
  Logger.log('Property "node" cleared.');

  scriptProperties.deleteProperty("study");
  Logger.log('Property "study" cleared.');

  scriptProperties.deleteProperty("project");
  Logger.log('Property "project" cleared.');
}