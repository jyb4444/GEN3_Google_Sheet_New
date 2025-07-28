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
        if (!nodeFilters || typeof nodeFilters !== 'object') {
          return "";
        }
        
        const filterPairs = [];
        for (const [key, value] of Object.entries(nodeFilters)) {
          // Handle string values (wrap in quotes)
          if (typeof value === 'string') {
            filterPairs.push(`${key}: "${value}"`);
          } else {
            // Handle other types (numbers, booleans, etc.)
            filterPairs.push(`${key}: ${value}`);
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
        const filterArgs = supportsFilters ? buildFilterArgs(currentNode) : "";
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

function flattenDataStructure(data) {
  const result = [];
  
  // Recursive function to traverse nested structure
  function traverse(obj, nodeType = '') {
    // If current object has code (project level)
    if (obj.code) {
      result.push({"project.code": obj.code});
    }
    
    // If current object has submitter_id, add to result based on node type
    if (obj.submitter_id && nodeType) {
      result.push({[`${nodeType}.submitter_id`]: obj.submitter_id});
    }
    
    // Traverse all properties and continue recursion
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        // Determine child node type based on property name
        let childNodeType = '';
        switch(key) {
          case 'aligned_reads': childNodeType = 'aligned_read'; break;
          case 'aligned_reads_analyzed_datas': childNodeType = 'aligned_reads_analyzed_data'; break;
          case 'alignment_workflows': childNodeType = 'alignment_workflow'; break;
          case 'aliquots': childNodeType = 'aliquot'; break;
          case 'cell_subjects': childNodeType = 'cell_subject'; break;
          case 'contacts': childNodeType = 'contact'; break;
          case 'core_metadata_collections': childNodeType = 'core_metadata_collection'; break;
          case 'culture_conditions': childNodeType = 'culture_conditions'; break;
          case 'culture_medias': childNodeType = 'culture_media'; break;
          case 'data_releases': childNodeType = 'data_release'; break;
          case 'diets': childNodeType = 'diet'; break;
          case 'flow_analysises': childNodeType = 'flow_analysis'; break;
          case 'flow_analysis_datas': childNodeType = 'flow_analysis_data'; break;
          case 'flow_cytometry_assays': childNodeType = 'flow_cytometry_assay'; break;
          case 'flow_datas': childNodeType = 'flow_data'; break;
          case 'fundings': childNodeType = 'funding'; break;
          case 'housings': childNodeType = 'housing'; break;
          case 'mass_spec_assays': childNodeType = 'mass_spec_assay'; break;
          case 'metabolite_ids': childNodeType = 'metabolite_id'; break;
          case 'metaschemas': childNodeType = 'metaschema'; break;
          case 'ms_analysed_datas': childNodeType = 'ms_analysed_data'; break;
          case 'ms_analyses': childNodeType = 'ms_analysis'; break;
          case 'ms_raw_datas': childNodeType = 'ms_raw_data'; break;
          case 'programs': childNodeType = 'program'; break;
          case 'projects': childNodeType = 'project'; break;
          case 'publications': childNodeType = 'publication'; break;
          case 'read_groups': childNodeType = 'read_group'; break;
          case 'roots': childNodeType = 'root'; break;
          case 'samples': childNodeType = 'sample'; break;
          case 'slides': childNodeType = 'slide'; break;
          case 'slide_images': childNodeType = 'slide_image'; break;
          case 'slide_pathologys': childNodeType = 'slide_pathology'; break;
          case 'studies': childNodeType = 'study'; break;
          case 'subjects': childNodeType = 'subject'; break;
          case 'treatments': childNodeType = 'treatment'; break;
          case 'unaligned_reads': childNodeType = 'unaligned_read'; break;
          case 'unaligned_reads_qcs': childNodeType = 'unaligned_reads_qc'; break;
          case 'weight_measurements': childNodeType = 'weight_measurement'; break;
        }
        
        // Recursively process each element in the array
        value.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            traverse(item, childNodeType);
          }
        });
      } else if (typeof value === 'object' && value !== null && key !== 'submitter_id' && key !== 'code' && key !== 'description') {
        // If it's an object, recursively process it
        traverse(value, nodeType);
      }
    }
  }
  
  // Start traversal
  traverse(data);
  
  return result;
}

function test(){
  const processor = createSubmissionProcessor();
  const path = processor.getFurthestAncestorPath();
  console.log(path)
}