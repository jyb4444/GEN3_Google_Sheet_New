function fetchProjectList() {
  const authProvider = getAuthProvider();
  
  const queryTxt = `{
    project {
      code
      description
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
    study (first: 100) {
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
    const filteredStudies = studyList.data.study.filter(study => {
      return study.projects.some(project => project.code === projectId);
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
      description
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

function traceToRoot(nodeName="study") {
    /**
     * Trace the path from the specified node to the root node (program).
     *
     * @param {string} nodeName - Enter the node name.
     * @returns {array} - An array of paths from the input node to the root node.
     */
    const dictionary = JSON.parse(getAllNode());

    let path = [];
    let currentNode = nodeName;

    while (currentNode) {
        path.push(currentNode);

        const nodeLinks = dictionary[currentNode]?.links || [];

        let parentNode = null;

        for (const link of nodeLinks) {
            if (link.subgroup) {
                Logger.log(`Subgroup found for ${currentNode}:`, link.subgroup);
                const requiredSubgroup = link.subgroup.find(sub => sub.required === true);
                if (requiredSubgroup && requiredSubgroup.target_type) {
                    parentNode = requiredSubgroup.target_type;
                    Logger.log(`Parent from subgroup: ${parentNode}`);
                    break;
                }
            } 
            else if (link.target_type) {
                parentNode = link.target_type;
                Logger.log(`Parent from link: ${parentNode}`);
                break;
            }
        }

        if (!parentNode) {
            Logger.log(`No parent found for node: ${currentNode}`);
            break;
        }

        currentNode = parentNode;
    }
    path.pop()
    path.pop()
    path.shift()

    if(path.length <= 2 && path.length > 0){
      path = path.reverse().map((ele,idx) => {
          return `${ele}_submitter_id`
      })
    }else if(path.length === 0){
      return ["study_submitter_id"];  //which means it comes to study node
    }else{
      path = path.reverse().map((ele,idx) => {
        if(idx === path.length - 1){
          return `_${ele}_id`
        }else{
          return `${ele}_submitter_id`
        }
      })
    }

    Logger.log(`Final path: ${path}`);
    return path.reverse()
}
