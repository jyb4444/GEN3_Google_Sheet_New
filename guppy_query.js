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
        ${fields.join(",\n")}
      }
    }

  `;
  let variables = { filter: filterObject };

  return this.graphqlQuery(queryString, variables);
};

Gen3Query.prototype.graphqlQuery = function (queryString, variables) {
  const url = `${this._authProvider.endpoint}/guppy/graphql`;
  const accessToken = this.getAccessToken();

  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      query: queryString,
      variables: variables
    }),
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

Gen3Query.prototype.getAccessToken = function () {
  try {
    const fileId = '12PhJxjN3fLofYOjGxqYuMVuA2TTeSh2i'; //keji
    // const fileId = '1_hF1BLLni4ipHiPld77L6EcIEu2TA0pu'; 

    let file;
    try {
      file = DriveApp.getFileById(fileId);
    } catch (e) {
      Logger.log('The file specified cannot be found. Please check if the file ID is correct.');
      Logger.log('Current file id: ' + fileId);
      throw new Error('File access failed:' + e.message);
    }

    try {
      const content = file.getBlob().getDataAsString();
      const jsonData = JSON.parse(content);
      
      if (!jsonData.api_key || !jsonData.key_id) {
        throw new Error('Credentials file is missing a required field (api_key or key_id)');
      }

      return jsonData.api_key
      // return {
      //   endpoint: "https://toxdatacommons.com",
      //   accessToken: jsonData.api_key,
      //   keyId: jsonData.key_id
      // };
    } catch (e) {
      Logger.log('Parsing of file content failed. Please make sure the file contains valid JSON data');
      throw new Error('File format error:' + e.message);
    }
  } catch (error) {
    Logger.log('Error Detail：' + error.toString());
    throw error;
  }
};

Gen3Query.prototype.normalizeResponse = function (rawResponse) {
  return rawResponse; 
};

// Args:
//     data_type (str): Data type to query.
//     fields (list): List of fields to return.
//     first (int, optional): Number of rows to return (default: 10).
//     offset (int, optional): Starting position (default: 0).
//     filters: (object, optional): { field: sort method } object. Will filter data with ALL fields EQUAL to the provided respective value. If more complex filters are needed, use the `filter_object` parameter instead.
//     filter_object (object, optional): Filter to apply. For syntax details, see https://github.com/uc-cdis/guppy/blob/master/doc/queries.md#filter.
//     sort_object (object, optional): { field: sort method } object.
//     accessibility (list, optional): One of ["accessible" (default), "unaccessible", "all"]. Only valid when querying a data type in "regular" tier access mode.

function fetchDataByConditions(project, study, node) {
  const authProvider = getAuthProvider();
  const query = new Gen3Query(authProvider);
  let fieldsList = traceToRoot(node);
  // SpreadsheetApp.getUi().alert(JSON.stringify(query))
  // fields= [`_${node}_id`, "subject_submitter_id", "study_submitter_id"],

  const data = query.query(
    data_type= "treatment_project_ids",
    fields = fieldsList,
    first=100,
    offset = 0,
    filters= {
      "project_id": "MSUSRC-" + project,
      "study_submitter_id": study,
      
    },
    null,
    sort_object={"submitter_id": "asc"},
  );

  return data;
}

