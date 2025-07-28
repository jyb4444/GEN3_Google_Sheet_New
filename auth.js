// let fileData1 = "ewoJImFwaV9rZXkiOiAiZXlKaGJHY2lPaUpTVXpJMU5pSXNJbXRwWkNJNkltWmxibU5sWDJ0bGVWOXJaWGtpTENKMGVYQWlPaUpLVjFRaWZRLmV5SndkWElpT2lKaGNHbGZhMlY1SWl3aWMzVmlJam9pTVRBaUxDSnBjM01pT2lKb2RIUndjem92TDJSbGRpNTBiM2hrWVhSaFkyOXRiVzl1Y3k1amIyMHZkWE5sY2lJc0ltRjFaQ0k2V3lKb2RIUndjem92TDJSbGRpNTBiM2hrWVhSaFkyOXRiVzl1Y3k1amIyMHZkWE5sY2lKZExDSnBZWFFpT2pFM05UTXpOVGs0T0RVc0ltVjRjQ0k2TVRjMU5UazFNVGc0TlN3aWFuUnBJam9pWkRObU5XVXdObVl0T0dJNFlTMDBZbVk0TFRobVlUa3RZbVJoTlRrME5qZG1aRFE0SWl3aVlYcHdJam9pSWl3aWMyTnZjR1VpT2xzaWIzQmxibWxrSWl3aVoyOXZaMnhsWDNObGNuWnBZMlZmWVdOamIzVnVkQ0lzSW5WelpYSWlMQ0puYjI5bmJHVmZiR2x1YXlJc0ltWmxibU5sSWl3aVoyRTBaMmhmY0dGemMzQnZjblJmZGpFaUxDSmtZWFJoSWl3aVoyOXZaMnhsWDJOeVpXUmxiblJwWVd4eklpd2lZV1J0YVc0aVhYMC5JczQ2THpEVjZDZk5PMlZqYVYxRDBRYmN3QmxQNmdoU0FudUt4bEpCUHd1Q0Y1RXNuWWtRbU5vOU9JODVSNWZkMXdiNF81ck9hNjJ2VlBkQy1VcEthRm1CUzhSVHg3YVJGaVBhbzNzWHJYLTU4N19RcHE0SXBDcDIybTVZdDN1SUZKeXdkdDJRVjcyY1lOeVJHY2ZaYWFrZ1NBNzI2YWhhTFJJMFEwNG9ndzBlRkdSOXJPUE5IRHRZWkxtN2xMWENWbXVkTnZ4R2FTV1ZHLUROS29NZUVHVE8zUk5LQmlGNDJNRDFCbGV5VVQzTjVCQ0QwRFlhOExjaTZVVzFyNEdISnk0UUwxVlpudU92MkpETXFvZmNqYXZUOVFvN1hUcEVKamlyS3lZZTF0dTlETjNseXhRZFg2WkpLT1U5VjRNSjZERlMxQ0ZVcEY4NTl1Y1lmdDRCRjJOM0IzcGhhRUpzdGxsNXA5Umo1NU5CX1JBOXhFTDlKUzVtTEV3cmdGMkNKbDRpbjFud19VUXJESGk5ZXFuSXlYSmFJQzBNdlZrRUtETlFZOEFKMUhGLW1lLUk3VGs0RDdOS0Jydm5obHBuQ3JzUlZsQ1RKMy1NOEFBVUNhMjNxR2UtTzNKQkI5a0tWUHZ1RlNUTjhiLVFOdEpMRmpFWG15dkd5VjVJVTg4T0xMU0Y2QXFiano4Qy1sdTdMNHloc0YyQzgtZ3hZVWpveUlWbU5rYUJzdk9sMGFOaGc4Q00ydzg5OXQ3aEZRRmxBZHJ4RFpvbUUyWnh1U0FKRWNIQWdPcXVtdEMyWndycmNWMFFWTUhtWTJsYm9UQ0JuRW9ibUxVaUk4czdSNTM5bFNnN1dqd3NwSlozQXRHTW9LSllBY0FFbWhDYlN6RFRBZHJxRkhZa29VQSIsCgkia2V5X2lkIjogImQzZjVlMDZmLThiOGEtNGJmOC04ZmE5LWJkYTU5NDY3ZmQ0OCIKfQ=="

// let fileName1 = "credentials_dev.json"
// let mimeType1 = "application/json"
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
        endpoint: "https://dev.toxdatacommons.com",
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