#!/usr/bin/env python3
"""
File Processing and Submission System
Handles two types of files:
1. TSV files with format: project-study-node.tsv
2. Data files with format: project-study-datafile.tsv
"""

import pandas as pd
import subprocess
import sys
import json
import requests
import os
import random
import string
import re
import time
from pathlib import Path
from gen3.submission import Gen3Submission
from gen3.auth import Gen3Auth
from gen3.index import Gen3Index
from gen3.query import Gen3Query
from gen3.metadata import Gen3Metadata
from gen3.file import Gen3File
from requests.auth import HTTPBasicAuth
from typing import Iterable, Tuple, Dict, Any

class FileProcessor:
    def __init__(self, api_url='https://dev.pvatppgmsu.com/', 
                 cred_path='/Users/kejiyuan/Desktop/credentials_dev.json',
                 base_path=None, prog=None, proj=None, profile=None):
        """Initialize the file processor with API credentials"""
        self.api_url = api_url
        self.cred_path = cred_path
        self.base_path = base_path
        self.prog = prog
        self.proj = proj
        self.auth = Gen3Auth(api_url, refresh_file=cred_path)
        self.sub = Gen3Submission(api_url, self.auth)
        self.query = Gen3Query(self.auth)
        self.index = Gen3Index(self.auth)
        self.file = Gen3File(self.auth)
        self.metadata = Gen3Metadata(self.auth)
        
        # For file upload operations
        self.auth2 = HTTPBasicAuth('gdcapi', 'gdcapi')
        self.index2 = Gen3Index(api_url, auth_provider=self.auth2)
    
    def random_string(self, length=10):
        """Generate random string with letters and digits"""
        characters = string.ascii_letters + string.digits
        return ''.join(random.choice(characters) for _ in range(length))
    
    def parse_filename(self, filename):
        """
        Parse filename to determine file type and extract components
        Returns: (file_type, components)
        file_type: 'tsv' or 'data'
        components: dict with parsed components
        """
        basename = os.path.basename(filename)
        
        # Pre-process: Remove "__" and everything after it
        if "__" in basename:
            # Find the position of "__" and truncate
            double_underscore_pos = basename.find("__")
            # Get the file extension first
            name_part, ext = os.path.splitext(basename)
            # Remove "__" and everything after it from the name part
            if "__" in name_part:
                name_part = name_part[:name_part.find("__")]
            # Reconstruct the basename
            basename = name_part + ext
        
        # Check for TSV format: project-study-node.tsv
        tsv_pattern = r'^([^-]+)-([^-]+)-([^\.]+)\.tsv$'
        tsv_match = re.match(tsv_pattern, basename)

        if tsv_match:
            # Check if it's a datafile (contains 'datafile' in the node part)
            if 'datafile' in tsv_match.group(3).lower():
                return 'data', {
                    'project': tsv_match.group(1),
                    'study': tsv_match.group(2),
                    'filename': basename,
                    'full_path': filename
                }
            else:
                return 'tsv', {
                    'project': tsv_match.group(1),
                    'study': tsv_match.group(2),
                    'node': tsv_match.group(3),
                    'filename': basename
                }
        
        raise ValueError(f"Filename '{basename}' doesn't match expected pattern: project-study-node.tsv")
    
    def get_node_dictionary(self, node):
        """
        Call API to get node dictionary
        Returns: properties from the node dictionary
        """
        api_url = f"{self.api_url}/api/v0/submission/_dictionary/{node}"
        
        try:
            response = requests.get(api_url)
            response.raise_for_status()
            
            dictionary = response.json()
            properties = dictionary.get('properties', {})
            required_fields = dictionary.get('required', [])
            
            print(f"Retrieved dictionary for node '{node}' with {len(properties)} properties and {len(required_fields)} required fields")
            return properties, required_fields
            
        except requests.exceptions.RequestException as e:
            print(f"Error calling API for node '{node}': {e}")
            raise
    
    def filter_columns(self, filename, node_properties, required_fields, node):
        """
        Compare file columns with node properties and keep only common ones
        Ensures all required_fields are preserved in the final result
        Properly handles data copying when columns are renamed
        Returns: filtered DataFrame and filtered filename
        """
        try:
            # Read the file
            df = pd.read_csv(filename, sep='\t')
            print(f"Original DataFrame shape: {df.shape}")
            print(f"Original columns: {list(df.columns)}")
            
            # First, rename the main node submitter_id column
            old_column_name = f'{node}.submitter_id'
            if old_column_name in df.columns:
                df = df.rename(columns={old_column_name: 'submitter_id'})
                print(f"Renamed: {old_column_name} -> submitter_id")

            # Handle submitter_id columns - rename df columns to match plural form in node_properties
            node_columns = set(node_properties.keys())
            rename_mapping = {}

            # Build rename mapping
            for df_col in df.columns:
                if '.submitter_id' in df_col:
                    # Extract prefix from df column (e.g., 'study' from 'study.submitter_id')
                    prefix = df_col.split('.submitter_id')[0]
                    plural_prefix = self.to_plural(prefix)
                    # If the plural form exists in node_properties
                    if plural_prefix in node_columns:
                        if plural_prefix == 'projects':
                            new_col_name = f'{plural_prefix}.code'
                            print(new_col_name)
                        else:
                            new_col_name = f'{plural_prefix}.submitter_id'
                        # new_col_name = f'{plural_prefix}.submitter_id'
                        rename_mapping[df_col] = new_col_name
                        print(f"Will rename: {df_col} -> {new_col_name} to match node_properties")

            # Apply the renaming - this automatically copies the data
            if rename_mapping:
                df = df.rename(columns=rename_mapping)
                print(f"Applied renaming mapping: {rename_mapping}")

            # Get current columns after renaming
            current_columns = set(df.columns)
            print(f"Columns after renaming: {list(current_columns)}")

            # Create modified node_columns by adding .submitter_id to matching plurals
            modified_node_columns = node_columns.copy()

            for df_col in current_columns:
                if '.submitter_id' in df_col:
                    # Extract prefix from df column 
                    prefix = df_col.split('.submitter_id')[0]
                    
                    # If this prefix exists in node_properties, convert it to .submitter_id format
                    if prefix in node_columns:
                        modified_node_columns.discard(prefix)  # Remove the simple form
                        modified_node_columns.add(df_col)      # Add the .submitter_id form
                        print(f"Converted node property: {prefix} -> {df_col}")

            for df_col in current_columns:
                if '.code' in df_col:
                    # Extract prefix from df column 
                    prefix = df_col.split('.code')[0]
                    
                    # If this prefix exists in node_properties, convert it to .submitter_id format
                    if prefix in node_columns:
                        modified_node_columns.discard(prefix)  # Remove the simple form
                        modified_node_columns.add(df_col)      # Add the .submitter_id form
                        print(f"Converted node property: {prefix} -> {df_col}")

            print("=========================================")
            print("Modified node columns:", sorted(modified_node_columns))
            print("=========================================")
            print("Current DataFrame columns:", sorted(current_columns))
            print("=========================================")
            print("Required fields:", required_fields)
            print("=========================================")

            # Find common columns (columns that exist in both DataFrame and node properties)
            common_columns = current_columns.intersection(modified_node_columns)
            
            # Ensure all required fields are included, even if they're not in the original file
            required_fields_set = set(required_fields)
            
            # Add required fields that might not be in common_columns
            missing_required_fields = required_fields_set - common_columns
            
            if missing_required_fields:
                print(f"Adding missing required fields: {sorted(missing_required_fields)}")
                # Add empty columns for missing required fields
                for field in missing_required_fields:
                    if field in modified_node_columns:  # Only add if it's a valid node property
                        df[field] = ''  # Add empty column
                        common_columns.add(field)
                        print(f"Added empty column for required field: {field}")
            
            # Final columns to keep: common columns + all required fields (that are valid node properties)
            final_columns = common_columns.union(required_fields_set.intersection(modified_node_columns))
            
            print(f"Original columns: {len(current_columns)}")
            print(f"Node properties: {len(node_columns)}")
            print(f"Modified node columns: {len(modified_node_columns)}")
            print(f"Common columns: {len(common_columns)}")
            print(f"Required fields: {len(required_fields_set)}")
            print(f"Final columns to keep: {len(final_columns)}")
            print(f"Final columns: {sorted(final_columns)}")
            
            if not final_columns:
                print("Warning: No columns to keep!")
                return df, filename
            
            # Filter DataFrame to keep only final columns
            # Note: The data has already been copied during the renaming process
            filtered_df = df[list(final_columns)]
            
            print(f"Filtered DataFrame shape: {filtered_df.shape}")
            print(f"Sample of filtered data:")
            print(filtered_df.head())
            
            # Save filtered file - properly construct the path
            current_dir = os.getcwd()  # 获取当前工作目录
            base_filename = os.path.basename(filename)
            filtered_filename = os.path.join(current_dir, base_filename.replace('.tsv', '_filtered.tsv'))
            
            filtered_df.to_csv(filtered_filename, sep='\t', index=False)
            
            print(f"Filtered file saved as: {filtered_filename}")
            
            # Verify data integrity by showing some examples
            if rename_mapping:
                print("\nData copying verification:")
                for old_col, new_col in rename_mapping.items():
                    if old_col in df.columns and new_col in filtered_df.columns:
                        print(f"Column '{new_col}' sample values: {filtered_df[new_col].head().tolist()}")
            
            return filtered_df, filtered_filename
            
        except Exception as e:
            print(f"Error filtering columns: {e}")
            raise

    def to_plural(self, word):
        """
        Simple pluralization function
        """
        if word.endswith('y'):
            return word[:-1] + 'ies'
        elif word.endswith(('s', 'sh', 'ch', 'x', 'z')):
            return word + 'es'
        else:
            return word + 's'
    
    def submit_tsv_file(self, filename, project, study, node):
        """
        Submit TSV file using Gen3 submission
        """
        try:
            # Get node dictionary
            node_properties, required_fields = self.get_node_dictionary(node)
            
            # Filter columns
            filtered_df, filtered_filename = self.filter_columns(filename, node_properties, required_fields, node)
            
            # Submit file
            prog = self.prog  # You may want to make this configurable
            proj = self.proj or project
            
            print(f"Submitting file: {filtered_filename}")
            print(f"Program: {prog}, Project: {proj}")
            
            data = self.sub.submit_file(
                filename=filtered_filename, 
                project_id=f"{prog}-{proj}"
            )
            
            print("Submission result:")
            print(data)
            print(json.dumps(data, indent=2))
            
            return data
            
        except Exception as e:
            print(f"Error submitting TSV file: {e}")
            raise
    
    def upload_file_and_get_guid(self, file_path, base_path):
        """
        Upload file using gen3-client and extract GUID from output
        If gen3-client fails, fall back to Python SDK upload
        """
        try:
            print(f"Uploading file: {file_path}")
            
            cmd = ['/Applications/gen3-client', 'upload', '--profile=poxdc', f'--upload-path={base_path}{file_path}']
            print("@@@@@@@@@@@@@@@@@@@@@@@@")
            print(cmd)
            print("@@@@@@@@@@@@@@@@@@@@@@@@")
            # Run the upload command - don't use check=True to handle errors manually
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            print("Upload command output:")
            print(result.stderr)
            print(result.stdout)
            
            # Extract GUID from output - improved pattern matching
            guid_pattern = r'to GUID (dg\.PDC/[a-f0-9-]+)'
            full_output = result.stdout + result.stderr
            guid_match = re.search(guid_pattern, result.stdout)
            
            if guid_match:
                guid = guid_match.group(1)
                print(f"Successfully extracted GUID from gen3-client: {guid}")
                return guid
            
            # Also check stderr for successful upload message
            stderr_guid_pattern = r'to GUID (dg\.PDC/[a-f0-9-]+)'
            stderr_match = re.search(stderr_guid_pattern, result.stderr)
            
            if stderr_match:
                guid = stderr_match.group(1)
                print(f"Successfully extracted GUID from gen3-client stderr: {guid}")
                return guid
            
            print("No GUID found in gen3-client output. Trying Python SDK upload...")
            return 
                
        except Exception as e:
            print(f"gen3-client error: {e}. Trying Python SDK upload...")
            return 
    
    def upload_metadata_to_gen3(self, record, submitter_id, file_type, study_submitter_id):
        """
        Upload file metadata to Gen3 (based on the upload function from your second code)
        """
        try:
            prog = self.prog  # You may want to make this configurable
            proj = self.proj  # You may want to make this configurable
            api_url = f"{self.api_url}/api/v0/submission/{prog}/{proj}"
            print("============================record=======")
            print(record)
            print("============================record=======")
            jsondata = []
            file_metadata = {
                'core_metadata_collections': {'submitter_id': proj},
                'md5sum': record['hashes']['md5'],
                'file_size': record['size'],
                'file_name': record['file_name'],
                'object_id': record['did'],
                'project_id': f"{prog}-{proj}",
                'submitter_id': submitter_id,
                'type': file_type,
                'study': [{"submitter_id": study_submitter_id}]
            }
            
            jsondata.append(file_metadata)
            
            print("Submitting metadata:")
            print(study_submitter_id)
            print(json.dumps(jsondata, indent=2))
            
            # Submit metadata
            output = requests.put(api_url, auth=self.auth, json=jsondata)
            
            if output.status_code != 200:
                print(f"Error response: {output.text}")
                try:
                    error_json = output.json()
                    print(f"Error details: {json.dumps(error_json, indent=2)}")
                except:
                    pass
                return False, output.text
            else:
                print("Metadata submission successful!")
                return True, output.json()
                
        except Exception as e:
            print(f"Error submitting metadata: {e}")
            return False, str(e)
    
    def process_data_file(self, filename, project, study, base_path):
        """
        Process data file (project-study-datafile.tsv format)
        1. Read the TSV file with columns: file_name, project, type, submitter_id
        2. For each row, upload the file and get GUID
        3. Submit metadata to Gen3
        """
        try:
            print(f"Processing data file: {filename}")
            
            # Read the TSV file
            df = pd.read_csv(filename, sep='\t')
            print(f"Data file shape: {df.shape}")
            print(f"Columns: {list(df.columns)}")
            print(f"Sample data:")
            print(df.head())
            
            # Check required columns
            required_columns = ['file_name', 'project', 'type', 'submitter_id']
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise ValueError(f"Missing required columns: {missing_columns}")
            
            if 'guid' not in df.columns:
                df['guid'] = ''

            results = []
            
            # Process each row
            for index, row in df.iterrows():
                print(f"\n--- Processing row {index + 1} ---")
                file_path = row['file_name']
                project_info = row['project']
                file_type = row['type']
                submitter_id = row['submitter_id']
                
                print(f"File path: {file_path}")
                print(f"Project: {project_info}")
                print(f"Study: {study}")
                print(f"Type: {file_type}")
                print(f"Submitter ID: {submitter_id}")
                
                try:
                    # Step 1: Upload file and get GUID
                    guid = self.upload_file_and_get_guid(file_path, base_path)
                    sleep_time = 30
                    print(f"⏳ Sleeping {sleep_time} seconds before next file...")
                    time.sleep(sleep_time)
                    
                    if not guid:
                        print(f"Failed to get GUID for file: {file_path}")
                        results.append({
                            'file_path': file_path,
                            'status': 'failed',
                            'error': 'Failed to get GUID from upload'
                        })
                        continue
                    
                    # Update the DataFrame with the GUID
                    df.at[index, 'guid'] = guid
                    print(f"Updated row {index + 1} with GUID: {guid}")
                    
                    # Save the updated TSV file after each successful GUID retrieval
                    df.to_csv(filename, sep='\t', index=False)
                    print(f"Updated TSV file saved: {filename}")
                    
                    # Step 2: Get record from index
                    print(f"Getting record for GUID: {guid}")
                    record = self.index2.get_record(guid)
                    print(f"Retrieved record: {record['file_name']}")
                    
                    # Step 3: Submit metadata
                    print(f"Submitting metadata for GUID: {guid}")
                    success, result = self.upload_metadata_to_gen3(
                        record, 
                        submitter_id, 
                        file_type, 
                        study  # Using project_info as study_submitter_id
                    )
                    
                    if success:
                        print(f"Successfully processed file: {file_path}")
                        results.append({
                            'file_path': file_path,
                            'guid': guid,
                            'status': 'success',
                            'result': result
                        })
                    else:
                        print(f"Failed to submit metadata for file: {file_path}")
                        print(f"Error: {result}")
                        results.append({
                            'file_path': file_path,
                            'guid': guid,
                            'status': 'metadata_failed',
                            'error': result
                        })
                        
                except Exception as e:
                    print(f"Error processing file {file_path}: {e}")
                    results.append({
                        'file_path': file_path,
                        'status': 'error',
                        'error': str(e)
                    })
            # Final save of the complete TSV file
            df.to_csv(filename, sep='\t', index=False)
            print(f"Final TSV file saved with all GUIDs: {filename}")
            
            # Summary
            successful = len([r for r in results if r['status'] == 'success'])
            total = len(results)
            print(f"\n--- Processing Summary ---")
            print(f"Total files: {total}")
            print(f"Successful: {successful}")
            print(f"Failed: {total - successful}")
            
            return results
            
        except Exception as e:
            print(f"Error processing data file: {e}")
            raise

    def update_dataframe_from_record(self, enhanced_df, index, record, prog, proj):
        """
        Update specific row in DataFrame from record dictionary
        
        Parameters:
        - enhanced_df: DataFrame to update
        - index: Row index to update
        - record: Dictionary containing file information
        - prog: Program ID
        - proj: Project ID
        - submitter_id: Submitter ID
        - type_value: Type value
        
        Returns:
        - updates_count: Number of updated fields
        """
        updates_count = 0
        
        print(f"Processing record: {record.get('file_name', 'Unknown')}")
        
        # Define field mappings to update
        field_mappings = {
            'md5sum': record.get('hashes', {}).get('md5'),
            'file_size': record.get('size'),
            'file_name': record.get('file_name'),
            'object_id': record.get('did'),
            'project_id': f"{prog}-{proj}"
        }
        
        # Handle complex fields
        # core_metadata_collections
        field_mappings['core_metadata_collections'] = proj  # Convert to JSON string
        # Iterate through field mappings and update DataFrame
        for column_name, new_value in field_mappings.items():
            if column_name in enhanced_df.columns:
                # Check if current value is empty or NaN
                current_value = enhanced_df.at[index, column_name]
                
                if pd.isna(current_value) or current_value == '' or current_value is None:
                    if new_value is not None:  # Only update when new value is not empty
                        enhanced_df.at[index, column_name] = new_value
                        updates_count += 1
                        print(f"  ✓ Updated {column_name}: {new_value}")
                    else:
                        print(f"  ⚠ Skipped {column_name}: new value is empty")
                else:
                    print(f"  - Skipped {column_name}: already has value '{current_value}'")
            else:
                print(f"  ⚠ Column '{column_name}' does not exist in DataFrame")
        
        return updates_count

    def enhance_csv_with_records(self, filename, index2, sep="\t"):
        """
        Read CSV file and enhance data using records obtained from index2.get_record()
        
        Parameters:
        - filename: CSV file path
        - index2: Index object containing get_record method
        - sep: CSV separator, default is tab
        
        Returns:
        - Enhanced DataFrame, returns original DataFrame if conditions not met
        """
        
        # 1. Read CSV file
        try:
            df = pd.read_csv(filename, sep=sep)
            print("Original data first 5 rows:")
            print(df.head())
            print(f"\nColumn names: {list(df.columns)}")
        except Exception as e:
            print(f"Failed to read file: {e}")
            return None
        
        # 2. Check if column names contain required columns
        required_columns = ['file_name', 'md5sum', 'object_id', 'file_size']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            print(f"Missing required columns: {missing_columns}")
            print("Returning original DataFrame")
            return df
        
        print("✓ All required columns exist")
        
        # 3. Read object_id column content and deduplicate
        unique_object_ids = df['object_id'].dropna().unique()
        print(f"\nFound {len(unique_object_ids)} unique object_ids")
        
        # 4. Get records for each unique object_id and process
        records_cache = {}  # Cache records to avoid duplicate queries
        
        for object_id in unique_object_ids:
            try:
                # Get record
                record = index2.get_record(object_id)
                print("--------------check----------------")
                print(object_id)
                print(record)
                if record is not None:
                    # If record is string, try to parse as JSON
                    if isinstance(record, str):
                        try:
                            record = json.loads(record)
                        except json.JSONDecodeError:
                            print(f"Warning: record for object_id {object_id} is not valid JSON format")
                            continue
                    
                    records_cache[object_id] = record
                    print(f"✓ Successfully obtained record for object_id {object_id}")
                else:
                    print(f"Warning: record not found for object_id {object_id}")
                    
            except Exception as e:
                print(f"Error getting record for object_id {object_id}: {e}")
        
        # 5. Check if record keys appear in DataFrame column names and fill corresponding values
        if not records_cache:
            print("No records successfully obtained, returning original DataFrame")
            return df
        
        # Create DataFrame copy to avoid modifying original data
        enhanced_df = df.copy()
        
        # Count update information
        updates_count = 0
        
        # Iterate through each row of DataFrame
        for index, row in enhanced_df.iterrows():
            object_id = row['object_id']
            
            # Skip null values or object_ids not in cache
            if pd.isna(object_id) or object_id not in records_cache:
                continue
            
            record = records_cache[object_id]
            updates_count = self.update_dataframe_from_record(
                enhanced_df, index, record, self.prog, self.proj
            )
        
        print(f"\nCompleted data enhancement:")
        print(f"- Processed {len(records_cache)} valid records")
        print(f"- Total updated {updates_count} cells")
        
        # Display enhanced data
        print(f"\nEnhanced data first 5 rows:")
        print(enhanced_df.head())
        
        return enhanced_df        

    def save_enhanced_csv(self, enhanced_df, output_filename, sep="\t"):
        try:
            enhanced_df.to_csv(output_filename, sep=sep, index=False)
            print(f"✓ enhanced data has been saved to: {output_filename}")
        except Exception as e:
            print(f"Save file failed: {e}")
    
    def process_file(self, filename, base_path):
        """
        Main processing function that handles both file types
        """
        print(f"Processing file: {filename}")
        
        try:
            # Parse filename to determine type
            file_type, components = self.parse_filename(filename)
            
            print(f"File type: {file_type}")
            print(f"Components: {components}")
            
            if file_type == 'tsv':
                # Handle TSV files (project-study-node.tsv)

                print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
                enhanced_df = self.enhance_csv_with_records(filename, self.index2)
                if enhanced_df is not None:
                    self.save_enhanced_csv(enhanced_df, filename)
                print("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")

                print("Processing TSV file...")
                result = self.submit_tsv_file(
                    filename,
                    components['project'],
                    components['study'],
                    components['node']
                )
                return result
                
            elif file_type == 'data':
                # Handle data files (project-study-datafile.tsv)
                print("Processing data file...")
                result = self.process_data_file(
                    filename,
                    components['project'],
                    components['study'],
                    base_path
                )
                return result
            
        except Exception as e:
            print(f"Error processing file: {e}")
            raise

def main():
    """
    Main function for command-line usage
    """
    import argparse
    
    parser = argparse.ArgumentParser(description='Process and upload files to Gen3 data commons')
    parser.add_argument('filename', help='Path to the TSV file to process')
    parser.add_argument('--base-path', type=str, help='Base path where data files are located (required for datafile processing)')
    parser.add_argument('--api-url', type=str, required=True, default='https://dev.pvatppgmsu.com/', 
                       help='API URL for Gen3 data commons')
    parser.add_argument('--cred-path', type=str, required=True, default='/Users/kejiyuan/Desktop/credentials_ppg.json',
                       help='Path to credentials JSON file')
    parser.add_argument('--prog', type=str, required=True, help='Program name (e.g., TRAINING)')
    parser.add_argument('--proj', type=str, required=True, help='Project name (e.g., training001)')
    parser.add_argument('--profile', type=str, required=True, help='Profile name (e.g., poxdc)')
    
    args = parser.parse_args()

    # Check if file exists
    if not os.path.exists(args.filename):
        print(f"Error: File '{args.filename}' not found")
        sys.exit(1)

    # Check if this is a datafile and base_path is provided
    if 'datafile' in args.filename.lower() and not args.base_path:
        print("Error: --base-path is required when processing datafile TSV files")
        print("Example: python file_processor.py training001-study_test001-datafile.tsv --base-path /path/to/data/files")
        sys.exit(1)
    
    # Validate base_path if provided
    if args.base_path and not os.path.exists(args.base_path):
        print(f"Error: Base path '{args.base_path}' does not exist")
        sys.exit(1)
    
    # Process the file
    processor = FileProcessor(
        api_url=args.api_url,
        cred_path=args.cred_path,
        base_path=args.base_path,
        prog =args.prog,
        proj=args.proj,
        profile=args.profile
    )

    try:
        result = processor.process_file(args.filename, args.base_path)
        print("\nProcessing completed successfully!")
        print("Result:", result)
    except Exception as e:
        print(f"\nProcessing failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()