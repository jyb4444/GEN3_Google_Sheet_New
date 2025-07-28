function Gen3Query(authProvider) {
  this._authProvider = authProvider;
}

Gen3Query.prototype.query = function (
  dataType,
  fields,
  first = 10,
  offset = 0,
  filters = null,
  filterObject = null,
  sortObject = null,
  accessibility = "accessible", 
  verbose = true
) {
  if (filters && filterObject) {
    throw new Error("Only one of `filters` and `filter_object` can be used at a time.");
  }
  
  if (filters) {
    filterObject = {
      AND: Object.keys(filters).map((field) => ({
        "=": { [field]: filters[field] }
      }))
    };
  }

  if (first + offset > 10000) { // ElasticSearch 限制
    const sortFields = Object.entries(sortObject || {}).map(([field, val]) => {
      return { [field]: val };
    });
    const data = this.rawDataDownload(
      dataType,
      fields,
      filterObject,
      sortFields,
      accessibility,
      first,
      offset
    );
    return { data: { [dataType]: data } };
  }

  const sortString = Object.entries(sortObject || {}).map(
    ([field, val]) => `{${field}: "${val}"}`
  ).join(", ");
  
  const queryString = `query($filter: JSON){
      ${dataType}(first: ${first}, offset: ${offset}, sort: [${sortString}], accessibility: ${accessibility}, filter: $filter) {
        ${fields ? fields.join(",\n") : new Array(0)}
      }
    }
  `;
  
  let variables = { filter: filterObject };

  return this.graphqlQuery(queryString, variables);
};

Gen3Query.prototype.graphqlQuery = function (authProvider, queryString) {
  const url = `${this._authProvider.endpoint}/api/v0/submission/graphql/`; 
  const accessToken = this.getAccessToken(authProvider);
  const payload = {
    query: queryString
  };
  console.log(accessToken)
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
    const normalizedData = this.normalizeResponse(rawResponse);
    return JSON.parse(normalizedData);
  } else {
    Logger.log("Error: " + response.getContentText());
    throw new Error("GraphQL query failed with status: " + response.getResponseCode());
  }
};

// Gen3Query.prototype.graphqlQuery = function (queryString, variables) {
//   const url = `${this._authProvider.endpoint}/guppy/graphql`;
//   const accessToken = this.getAccessToken();

//   const options = {
//     method: 'POST',
//     headers: {
//       'Authorization': `Bearer ${accessToken}`,
//       'Content-Type': 'application/json'
//     },
//     payload: JSON.stringify({
//       query: queryString,
//       variables: variables
//     }),
//     muteHttpExceptions: true
//   };
//   // SpreadsheetApp.getUi().alert(url)
//   // SpreadsheetApp.getUi().alert("payload: " + JSON.stringify(options.payload))
//   const response = UrlFetchApp.fetch(url, options);
//   // SpreadsheetApp.getUi().alert(response.getResponseCode())
//   if (response.getResponseCode() === 200) {
//     const rawResponse = response.getContentText();
//     const normalizedData = this.normalizeResponse(rawResponse);
//     return JSON.parse(normalizedData);
//   } else {
//     Logger.log("Error: " + response.getContentText());
//     throw new Error("GraphQL query failed with status: " + response.getResponseCode());
//   }
// };

Gen3Query.prototype.getAccessToken = function (authProvider) {
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

// Guppy version
// Gen3Query.prototype.getAccessToken = function () {
//   try {
//     const fileId = '1Rl832cNoSQm4WF9G4Z8ZsJ5auOYnVVmj'; //keji dev.toxdatacommon
//     // const fileId = '12PhJxjN3fLofYOjGxqYuMVuA2TTeSh2i'; //keji
//     // const fileId = '1_hF1BLLni4ipHiPld77L6EcIEu2TA0pu'; 

//     let file;
//     try {
//       file = DriveApp.getFileById(fileId);
//     } catch (e) {
//       Logger.log('The file specified cannot be found. Please check if the file ID is correct.');
//       Logger.log('Current file id: ' + fileId);
//       throw new Error('File access failed:' + e.message);
//     }

//     try {
//       const content = file.getBlob().getDataAsString();
//       const jsonData = JSON.parse(content);
//       if (!jsonData.api_key || !jsonData.key_id) {
//         throw new Error('Credentials file is missing a required field (api_key or key_id)');
//       }

//       return jsonData.api_key
//     } catch (e) {
//       Logger.log('Parsing of file content failed. Please make sure the file contains valid JSON data');
//       throw new Error('File format error:' + e.message);
//     }
//   } catch (error) {
//     Logger.log('Error Detail：' + error.toString());
//     throw error;
//   }
// };

Gen3Query.prototype.normalizeResponse = function (rawResponse) {
  return rawResponse; 
};

function fetchDataByConditions(project="GEN", study, node="flow_analysis_data") {

  const authProvider = getAuthProvider();
  const query = new Gen3Query(authProvider);

  project = project.split("-")[1]
  node = node.split("-")[0];
  PropertiesService.getScriptProperties().setProperty('node', node);
  
  const processor = createSubmissionProcessor();
  const path = processor.getFurthestAncestorPath(node);
  SpreadsheetApp.getUi().alert(path)
  console.log(path)
  const filters = {
      project: { code: project },
      study: { submitter_id: study }
    };
  const graphql_query_string = processor.generateGraphqlQuery(path, filters);
  console.log('GraphQL query with filters:', graphql_query_string);
  SpreadsheetApp.getUi().alert(graphql_query_string)


  const data = query.graphqlQuery(authProvider, graphql_query_string);
  SpreadsheetApp.getUi().alert(JSON.stringify(data))
  const parentCol = flattenDataStructure(data);
  const childCol = getNodeDictionary(node)
  // console.log(childCol.properties)
  // SpreadsheetApp.getUi().alert(JSON.stringify(data))
  const properties = childCol.properties;
  const hiddenProperties = childCol.systemProperties;

  
  return [parentCol, properties, hiddenProperties];
}


  // const graphql_query_string = `
  //   query ($filter: JSON) {
  //     treatment_project_ids(filter: $filter) {
  //       _treatment_id
  //       _treatment_project_ids_id
  //       auth_resource_path
  //       node_id
  //       project_id
  //       submitter_id
  //       subject_submitter_id
  //       study_submitter_id
  //     }
  //   }
  // `;
  // // SpreadsheetApp.getUi().alert(study.split("-")[0])
  // const variables = {
  //   "filter" : {
  //     "AND" : [ // Use "AND" to combine multiple filter conditions
  //       {
  //         "=" : {
  //           "project_id" : project.split("_")[0] // Still use "=" for direct string match
  //         }
  //       },
  //       {
  //         "in" : { // Use "in" for array fields to check if the array contains one of the values
  //           "study_submitter_id": [study.split("-")[0]] // Provide the value in an array
  //         }
  //       }
  //     ]
  //   }
  // };