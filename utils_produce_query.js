/**
 * DataDictionaryHandler class for Google Apps Script
 * Handles fetching and caching of data dictionary from API
 */
class DataDictionaryHandler {
  constructor(apiUrl = "https://dev.toxdatacommons.com//api/v0/submission/_dictionary/_all") {
    this.apiUrl = apiUrl;
    this._dictionaryAll = null; // Cache the dictionary once fetched
  }

  /**
   * Fetches the complete data dictionary from the specified API endpoint.
   * Caches the result after the first successful fetch.
   */
  getDictionaryAll() {
    if (this._dictionaryAll) {
      return this._dictionaryAll;
    }

    try {
      const response = UrlFetchApp.fetch(this.apiUrl);
      
      if (response.getResponseCode() !== 200) {
        throw new Error(`HTTP Error: ${response.getResponseCode()}`);
      }
      
      this._dictionaryAll = JSON.parse(response.getContentText());
      return this._dictionaryAll;
    } catch (error) {
      console.error(`Error fetching data dictionary from API: ${error.message}`);
      return {}; // Return an empty object on error
    }
  }
}

/**
 * SubmissionProcessor class for Google Apps Script
 * Processes submission data and generates GraphQL queries
 */
class SubmissionProcessor {
  constructor(dataDictionaryHandler) {
    this.sub = dataDictionaryHandler;
  }

  /**
   * Find the complete path from the furthest ancestor node to the given node, ignoring specified paths.
   * 
   * @param {string} node - The node name to search for
   * @param {Array<string>} excludedAncestors - List of ancestor nodes to ignore
   * @returns {Array<string>} Path list from the furthest ancestor to the given node
   */
  getFurthestAncestorPath(node="flow_analysis_data", excludedAncestors = ["core_metadata_collection", "cell_subject"]) {
    const dd = this.sub.getDictionaryAll();
    if (!(node in dd) && node !== "project") {
      return []; // Node does not exist
    }

    // Build reverse graph (child -> parents)
    const reverseGraph = {};
    
    // Initialize reverse graph
    Object.keys(dd).forEach(key => {
      reverseGraph[key] = [];
    });

    Object.entries(dd).forEach(([currentNodeName, nodeInfo]) => {
      const links = nodeInfo.links || [];
      const linksArray = Array.isArray(links) ? links : [];

      linksArray.forEach(link => {
        // Handle direct target_type
        if (link.target_type) {
          reverseGraph[currentNodeName].push(link.target_type);
        }
        
        // Handle target_type in subgroup
        if (link.subgroup) {
          const subLinks = Array.isArray(link.subgroup) ? link.subgroup : [link.subgroup];
          
          subLinks.forEach(subLink => {
            if (subLink && typeof subLink === 'object' && subLink.target_type) {
              reverseGraph[currentNodeName].push(subLink.target_type);
            }
          });
        }
      });
    });

    // Ensure 'project' is treated as root node
    if (!reverseGraph.project) {
      reverseGraph.project = [];
    }

    /**
     * Find all paths from start node to all root nodes
     * @param {string} startNode 
     * @returns {Array<Array<string>>}
     */
    const dfsFinAllPathsToRoots = (startNode) => {
      const allCompletePaths = [];
      
      const dfsRecursive = (currentNode, currentPath, visitedNodes) => {
        // Get parent nodes of current node
        const parents = reverseGraph[currentNode] || [];
        
        // If no parent nodes or it's project node, this is a complete path to root node
        if (parents.length === 0 || currentNode === "project") {
          allCompletePaths.push([...currentPath]);
          return;
        }
        
        // Explore all parent nodes
        parents.forEach(parent => {
          // Avoid forming cycles in single path
          if (!visitedNodes.has(parent)) {
            const newPath = [...currentPath, parent];
            const newVisited = new Set([...visitedNodes, parent]);
            dfsRecursive(parent, newPath, newVisited);
          }
        });
      };
      
      // Start DFS search
      dfsRecursive(startNode, [startNode], new Set([startNode]));
      return allCompletePaths;
    };

    // Get all paths from given node to root nodes
    const allPaths = dfsFinAllPathsToRoots(node);
    
    // Filter out paths containing excluded ancestors
    const validPaths = allPaths.filter(path => {
      // Check if path contains excluded ancestor nodes (except starting node)
      const pathExceptFirst = path.slice(1);
      return !excludedAncestors.some(excludedNode => pathExceptFirst.includes(excludedNode));
    });
    
    if (validPaths.length === 0) {
      return [];
    }
    
    // Find the longest valid path
    const longestPath = validPaths.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );
    
    // Reverse path to make it from ancestor to node
    return longestPath.reverse();
  }

  /**
   * Generate GraphQL query structure based on given path with optional filters
   * 
   * @param {Array<string>} path - Path from ancestor to target node
   * @param {Object} filters - Optional filters object with node-specific filter conditions
   *                          Example: { project: { code: "TDC0001" }, study: { submitter_id: "PRJ129" } }
   * @returns {string} Formatted GraphQL query string
   */
generateGraphqlQuery(path, filters = {}) {
    if (!path || path.length === 0) {
      return "";
    }

    const buildNestedStructure = (nodes, depth = 0) => {
      if (!nodes || nodes.length === 0) {
        return "";
      }
      
      const currentNode = nodes[0];
      const remainingNodes = nodes.slice(1);
      const indent = "  ".repeat(depth);
      
      // Build filter arguments for current node
      const buildFilterArgs = (nodeName) => {
        const nodeFilters = filters[nodeName];
        const filterPairs = [];
        
        // Add first: 3000 to all nodes except 'project' and 'study'
        if (nodeName !== "project" && nodeName !== "study") {
          filterPairs.push("first: 3000");
        }
        
        if (nodeFilters && typeof nodeFilters === 'object') {
          for (const [key, value] of Object.entries(nodeFilters)) {
            // Handle string values (wrap in quotes)
            if (typeof value === 'string') {
              filterPairs.push(`${key}: "${value}"`);
            } else {
              // Handle other types (numbers, booleans, etc.)
              filterPairs.push(`${key}: ${value}`);
            }
          }
        }
        
        return filterPairs.length > 0 ? `(${filterPairs.join(', ')})` : "";
      };
      
      // Determine fields and nested structure based on node type
      if (currentNode === "project") {
        const filterArgs = buildFilterArgs("project");
        const projectWithFilters = `${currentNode}${filterArgs}`;
        
        if (remainingNodes.length > 0) {
          const nested = buildNestedStructure(remainingNodes, depth + 1);
          return `${indent}${projectWithFilters} {\n${indent}  code\n${indent}  description\n${nested}${indent}}`;
        } else {
          return `${indent}${projectWithFilters} {\n${indent}  code\n${indent}  description\n${indent}}`;
        }
      } else {
        // For non-project nodes, use plural form as field name
        const fieldName = this._getPluralFieldName(currentNode);
        
        // Check if this node type supports filters (currently project and study)
        const supportsFilters = currentNode === "study";
        const filterArgs = supportsFilters ? buildFilterArgs(currentNode) : buildFilterArgs(currentNode);
        const fieldWithFilters = `${fieldName}${filterArgs}`;
        
        if (remainingNodes.length > 0) {
          const nested = buildNestedStructure(remainingNodes, depth + 1);
          return `${indent}${fieldWithFilters} {\n${indent}  submitter_id\n${nested}${indent}}`;
        } else {
          return `${indent}${fieldWithFilters} {\n${indent}  submitter_id\n${indent}}`;
        }
      }
    };

    return "{\n" + buildNestedStructure(path, 1) + "\n}";
  }

  /**
   * Convert node name to plural form field name
   * 
   * @param {string} nodeName - Singular form node name
   * @returns {string} Plural form field name
   */
  _getPluralFieldName(nodeName) {
    const specialCases = {
      'aligned_read': 'aligned_reads',
      'aligned_reads_analyzed_data': 'aligned_reads_analyzed_datas',
      'alignment_workflow': 'alignment_workflows',
      'aliquot': 'aliquots',
      'cell_subject': 'cell_subjects',
      'contact': 'contacts',
      'core_metadata_collection': 'core_metadata_collections',
      'culture_conditions': 'culture_conditions',
      'culture_media': 'culture_medias',
      'data_release': 'data_releases',
      'diet': 'diets',
      'flow_analysis': 'flow_analysises',
      'flow_analysis_data': 'flow_analysis_datas',
      'flow_cytometry_assay': 'flow_cytometry_assays',
      'flow_data': 'flow_datas',
      'funding': 'fundings',
      'housing': 'housings',
      'mass_spec_assay': 'mass_spec_assays',
      'metabolite_id': 'metabolite_ids',
      'metaschema': 'metaschemas',
      'ms_analysed_data': 'ms_analysed_datas',
      'ms_analysis': 'ms_analyses',
      'ms_raw_data': 'ms_raw_datas',
      'program': 'programs',
      'project': 'projects',
      'publication': 'publications',
      'read_group': 'read_groups',
      'root': 'roots',
      'sample': 'samples',
      'slide': 'slides',
      'slide_image': 'slide_images',
      'slide_pathology': 'slide_pathologys',
      'study': 'studies',
      'subject': 'subjects',
      'treatment': 'treatments',
      'unaligned_read': 'unaligned_reads',
      'unaligned_reads_qc': 'unaligned_reads_qcs',
      'weight_measurement': 'weight_measurements',
    };
    
    if (nodeName in specialCases) {
      return specialCases[nodeName];
    }
    
    // Default rules: simple addition of s
    if (nodeName.endsWith('y')) {
      return nodeName.slice(0, -1) + 'ies';
    } else if (nodeName.endsWith('s') || nodeName.endsWith('sh') || 
               nodeName.endsWith('ch') || nodeName.endsWith('x') || 
               nodeName.endsWith('z')) {
      return nodeName + 'es';
    } else {
      return nodeName + 's';
    }
  }
}

// Google Apps Script helper functions
/**
 * Create and return a configured SubmissionProcessor instance
 * This is the main entry point function that can be called in Google Sheets
 * 
 * @returns {SubmissionProcessor} Configured processor instance
 */
function createSubmissionProcessor() {
  const ddHandler = new DataDictionaryHandler();
  return new SubmissionProcessor(ddHandler);
}

/**
 * Get ancestor path for specified node
 * This is a convenience function that can be called directly in Google Sheets
 * 
 * @param {string} nodeName - Node name
 * @param {Array<string>} excludedAncestors - Optional, ancestor nodes to exclude
 * @returns {Array<string>} Ancestor path
 */
function getNodeAncestorPath(nodeName, excludedAncestors) {
  const processor = createSubmissionProcessor();
  return processor.getFurthestAncestorPath(nodeName, excludedAncestors);
}

/**
 * Generate GraphQL query for specified node with optional filters
 * This is a convenience function that can be called directly in Google Sheets
 * 
 * @param {string} nodeName - Node name
 * @param {Array<string>} excludedAncestors - Optional, ancestor nodes to exclude
 * @param {Object} filters - Optional filters object with node-specific filter conditions
 *                          Example: { project: { code: "TDC0001" }, study: { submitter_id: "PRJ129" } }
 * @returns {string} GraphQL query string
 */
function generateNodeGraphQLQuery(nodeName, excludedAncestors, filters = {}) {
  const processor = createSubmissionProcessor();
  const path = processor.getFurthestAncestorPath(nodeName, excludedAncestors);
  return processor.generateGraphqlQuery(path, filters);
}

/**
 * Test function - can be used to verify functionality works properly
 */
function testFunction() {
  try {
    const processor = createSubmissionProcessor();
    
    // Test getting path
    const path = processor.getFurthestAncestorPath('slide_pathology');
    console.log('Path for slide_pathology:', path);
    
    // Test generating GraphQL query with filters
    const filters = {
      project: { code: "TDC0001" },
      study: { submitter_id: "PRJ129" }
    };
    const query = processor.generateGraphqlQuery(path, filters);
    console.log('GraphQL query with filters:', query);
    
    // Test without filters
    const queryNoFilters = processor.generateGraphqlQuery(path);
    console.log('GraphQL query without filters:', queryNoFilters);
    
    return { path, query, queryNoFilters };
  } catch (error) {
    console.error('Test failed:', error);
    return { error: error.message };
  }
}

function flattenDataStructure(data, path = []) {
  const result = [];
  
  // Recursive function to traverse nested structure and maintain path context
  function traverse(obj, currentPath = {}, nodeType = '') {
    let newPath = { ...currentPath };
    
    // If current object has code (project level), add to path
    if (obj.code) {
      newPath["project.code"] = obj.code;
    }
    
    // If current object has submitter_id, add to path based on node type
    if (obj.submitter_id && nodeType) {
      newPath[`${nodeType}.submitter_id`] = obj.submitter_id;
    }
    
    // Add other properties that are not arrays or objects
    for (const [key, value] of Object.entries(obj)) {
      if (key !== 'submitter_id' && key !== 'code' && key !== 'description' && 
          !Array.isArray(value) && typeof value !== 'object') {
        if (nodeType) {
          newPath[`${nodeType}.${key}`] = value;
        } else {
          newPath[key] = value;
        }
      }
    }
    
    // Check if this object has any child arrays
    let hasChildArrays = false;
    let childArrays = [];
    
    // First pass: identify all child arrays
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        hasChildArrays = true;
        childArrays.push({ key, value, nodeType: getNodeType(key) });
      }
    }
    
    // If no child arrays, this is a leaf node - add to results
    if (!hasChildArrays) {
      result.push(newPath);
      return;
    }
    
    // Process child arrays - ensure consistent row count
    if (childArrays.length === 1) {
      // Single child array case
      const { key, value, nodeType: childNodeType } = childArrays[0];
      if (value.length === 0) {
        // Empty array - add current path with empty values for this child type
        const emptyChildPath = { ...newPath };
        // Add empty placeholder columns for this child node type
        addEmptyColumnsForNodeType(emptyChildPath, childNodeType);
        result.push(emptyChildPath);
      } else {
        // Process each item in the array
        value.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            traverse(item, newPath, childNodeType);
          }
        });
      }
    } else {
      // Multiple child arrays case - need to handle cross-product
      handleMultipleChildArrays(obj, newPath, childArrays);
    }
  }
  
  // Helper function to handle multiple child arrays
  function handleMultipleChildArrays(obj, currentPath, childArrays) {
    // Find the maximum length among all child arrays
    const maxLength = Math.max(...childArrays.map(({ value }) => Math.max(value.length, 1)));
    
    // Generate combinations for each position up to maxLength
    for (let i = 0; i < maxLength; i++) {
      let combinedPath = { ...currentPath };
      let hasValidData = false;
      
      // Process each child array at position i
      childArrays.forEach(({ key, value, nodeType: childNodeType }) => {
        if (i < value.length && value[i]) {
          // Item exists at this position
          const item = value[i];
          if (typeof item === 'object' && item !== null) {
            // Add submitter_id if exists
            if (item.submitter_id && childNodeType) {
              combinedPath[`${childNodeType}.submitter_id`] = item.submitter_id;
            }
            
            // Add other properties that are not arrays or objects
            for (const [itemKey, itemValue] of Object.entries(item)) {
              if (itemKey !== 'submitter_id' && itemKey !== 'code' && itemKey !== 'description' && 
                  !Array.isArray(itemValue) && typeof itemValue !== 'object') {
                if (childNodeType) {
                  combinedPath[`${childNodeType}.${itemKey}`] = itemValue;
                } else {
                  combinedPath[itemKey] = itemValue;
                }
              }
            }
            hasValidData = true;
          }
        } else {
          // No item at this position or empty array - add empty placeholders
          addEmptyColumnsForNodeType(combinedPath, childNodeType);
        }
      });
      
      // Add the combined path to results
      result.push(combinedPath);
      
      // If any child array has nested arrays, we need to handle those recursively
      // For now, we'll handle the simple case where child items don't have further nested arrays
      childArrays.forEach(({ key, value, nodeType: childNodeType }) => {
        if (i < value.length && value[i]) {
          const item = value[i];
          if (typeof item === 'object' && item !== null) {
            // Check if this item has nested arrays
            const hasNestedArrays = Object.values(item).some(val => Array.isArray(val) && val.length > 0);
            if (hasNestedArrays) {
              // Remove the current result and process recursively instead
              result.pop();
              traverse(item, currentPath, childNodeType);
              return;
            }
          }
        }
      });
    }
  }
  
  // Helper function to add empty columns for a specific node type
  function addEmptyColumnsForNodeType(path, nodeType) {
    if (!nodeType) return;
    
    // Add common empty columns that might exist for this node type
    path[`${nodeType}.submitter_id`] = '';
    
    // You can add more common column patterns here if needed
    // For example: path[`${nodeType}.id`] = '';
  }
  
  // Helper function to determine node type from property name
  function getNodeType(key) {
    const nodeTypeMap = {
      'aligned_reads': 'aligned_read',
      'aligned_reads_analyzed_datas': 'aligned_reads_analyzed_data',
      'alignment_workflows': 'alignment_workflow',
      'aliquots': 'aliquot',
      'cell_subjects': 'cell_subject',
      'contacts': 'contact',
      'core_metadata_collections': 'core_metadata_collection',
      'culture_conditions': 'culture_conditions',
      'culture_medias': 'culture_media',
      'data_releases': 'data_release',
      'diets': 'diet',
      'flow_analysises': 'flow_analysis',
      'flow_analysis_datas': 'flow_analysis_data',
      'flow_cytometry_assays': 'flow_cytometry_assay',
      'flow_datas': 'flow_data',
      'fundings': 'funding',
      'housings': 'housing',
      'mass_spec_assays': 'mass_spec_assay',
      'metabolite_ids': 'metabolite_id',
      'metaschemas': 'metaschema',
      'ms_analysed_datas': 'ms_analysed_data',
      'ms_analyses': 'ms_analysis',
      'ms_raw_datas': 'ms_raw_data',
      'programs': 'program',
      'projects': 'project',
      'publications': 'publication',
      'read_groups': 'read_group',
      'roots': 'root',
      'samples': 'sample',
      'slides': 'slide',
      'slide_images': 'slide_image',
      'slide_pathologys': 'slide_pathology',
      'studies': 'study',
      'subjects': 'subject',
      'treatments': 'treatment',
      'unaligned_reads': 'unaligned_read',
      'unaligned_reads_qcs': 'unaligned_reads_qc',
      'weight_measurements': 'weight_measurement'
    };
    
    return nodeTypeMap[key] || '';
  }
  
  // Start traversal from the data object
  if (data && data.data) {
    traverse(data.data);
  } else {
    traverse(data);
  }
  
  return result;
}

// To better cooperate with the displayResults function, add a helper function to further process the data
function prepareDataForSheet(flattenedData, path = []) {
  if (!flattenedData || flattenedData.length === 0) {
    return [];
  }
  
  // Make sure all rows have the same column structure
  const allColumns = new Set();
  flattenedData.forEach(row => {
    Object.keys(row).forEach(col => allColumns.add(col));
  });
  
  // Determine the order of submitter_id columns based on path
  const getOrderedColumns = (columns, path) => {
    const submitterIdColumns = [];
    const otherColumns = [];
    
    // First add the submitter_id column in the order of path
    path.forEach(nodeType => {
      const columnName = `${nodeType}.submitter_id`;
      if (columns.has(columnName)) {
        submitterIdColumns.push(columnName);
      }
    });
    
    // Add a non-submitter_id column
    columns.forEach(col => {
      if (!col.includes('.submitter_id')) {
        otherColumns.push(col);
      }
    });
    
    // project.code should be at the front
    const projectCodeIndex = otherColumns.indexOf('project.code');
    if (projectCodeIndex > -1) {
      otherColumns.splice(projectCodeIndex, 1);
      otherColumns.unshift('project.code');
    }
    
    // Returns the sorted columns: project.code, then submitter_id in path order, and finally other columns
    return [...otherColumns, ...submitterIdColumns];
  };
  
  const orderedColumns = getOrderedColumns(allColumns, path);
  
  // Normalize each row to ensure all columns are present and in the correct order
  return flattenedData.map(row => {
    const standardizedRow = {};
    orderedColumns.forEach(col => {
      standardizedRow[col] = row[col] || '';
    });
    return standardizedRow;
  });
}

function test(){
  const processor = createSubmissionProcessor();
  const path = processor.getFurthestAncestorPath();
  console.log(path)
}