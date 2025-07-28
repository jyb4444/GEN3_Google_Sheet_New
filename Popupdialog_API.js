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

function saveToGoogleDrive() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();

    var tsvData = values.map(function(row) {
      return row.join('\t');
    }).join('\n');

    const sheetName = PropertiesService.getScriptProperties().getProperty("node").split("-")[0];

    var fileName = sheetName + ".tsv";
    var blob = Utilities.newBlob(tsvData, "text/tab-separated-values", fileName);

    var file = DriveApp.createFile(blob);

    var fileUrl = file.getUrl();
    Logger.log("TSV file saved to Drive: " + fileUrl);
    return "TSV file '" + fileName + "' saved successfully to your Google Drive. You can find it here: " + fileUrl;

  } catch (error) {
    Logger.log("Error saving TSV file: " + error);
    return "Error saving TSV file: " + error; 
  }
}
