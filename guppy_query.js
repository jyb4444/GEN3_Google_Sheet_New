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

  if (first + offset > 10000) { 
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

Gen3Query.prototype.normalizeResponse = function (rawResponse) {
  return rawResponse; 
};

function fetchDataByConditions(project="GEN", study, node="flow_analysis_data") {
  const authProvider = getAuthProvider();
  const query = new Gen3Query(authProvider);

  project = project.split("-")[1]
  node = node.split("-")[0];
  PropertiesService.getScriptProperties().setProperty('node', node);
  PropertiesService.getScriptProperties().setProperty('study', study);
  PropertiesService.getScriptProperties().setProperty('project', project);
  
  const processor = createSubmissionProcessor();
  const path = processor.getFurthestAncestorPath(node);
  // SpreadsheetApp.getUi().alert(path)

  const filters = {
      project: { code: project },
      study: { submitter_id: study }
    };
  const graphql_query_string = processor.generateGraphqlQuery(path, filters);
  // SpreadsheetApp.getUi().alert(graphql_query_string)

  const data = query.graphqlQuery(authProvider, graphql_query_string);
  // SpreadsheetApp.getUi().alert(JSON.stringify(data))
  
  const parentCol = flattenDataStructure(data, path);
  // SpreadsheetApp.getUi().alert(JSON.stringify(parentCol))
  const preparedData = prepareDataForSheet(parentCol, path);
  const childCol = getNodeDictionary(node)
  
  const properties = childCol.properties;
  const hiddenProperties = childCol.systemProperties;

  return [preparedData, properties, hiddenProperties];
}