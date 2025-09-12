# INTRODUCTION
This python script is used to automatically process TSV format node files and data files saved in Google Sheets and submit them to the corresponding GEN3 platform.
The main stuffs are as follows:
  1. Parse and validate file names to distinguish between TSV node files and data files.
  2. For node files: Automatically retrieve the node dictionary, filter, and match TSV file columns. Upload data files using gen3-client.
  3. For data files: Automatically process each file in the table. Use gen3-client to retrieve each file's GUID and upload the file.

# Data File 
1. Node TSV File
  Format: project-study-node.tsv
  Used for submitting experiment node data.
  Example: TRINING-training001-subject.tsv

2. Data File TSV
  Format: project-study-datafile.tsv
  Must include the following columns: file_name, project, type, submitter_id
  Used for batch uploading data files and submitting corresponding metadata.
  Example: TRINING-training001-datafile.tsv

3. Credentials File (credentials)
  JSON format, contains authentication information for accessing Gen3 Data Commons.
  Example: /Users/<username>/Desktop/credentials_dev.json


# How to run?
You can use the following command line parameters to run the python script.

| Parameters    | Reuiqred  | Info
| ------------- | ----------| -----------------------------------------------------------------------------------------------------
| `filename`    | ✅        | TSV file path， `/path/project-study-node.tsv` and `/path/project-study-datafile.tsv` 
| `--prog`      | ✅        | Program name，like `TRAINING`                                            
| `--proj`      | ✅        | Project name，like `training001`                                         
| `--api-url`   | ✅        | Gen3 API address，like `https://dev.pvatppgmsu.com/`                        
| `--cred-path` | ✅        | Credential JSON file path
| `--base-path` | ⚠️        | The directory where the data files are located. This is only required when processing `datafile.tsv` 
| `--profile`   | ✅        | Profile name like `poxdc`
For example, if you want to upload the node file, you can run "python auto_gen3_upload.py /Users/kejiyuan/Desktop/auto_gen3_handler/ppg_training/PPG-PPGTEST-subject.tsv --api-url https://dev.pvatppgmsu.com/ --cred-path /Users/kejiyuan/Desktop/credentials_ppg.json --prog PPG --proj PPGTEST --profile poxdc"
Or if you want to upload the datafile, you can run "python auto_gen3_upload.py PPG-PPGTEST-DataFile.tsv --base-path /Users/kejiyuan/Desktop/auto_gen3_handler/Training/TRAINING/DataFiles/ --api-url https://dev.pvatppgmsu.com/ --cred-path /Users/kejiyuan/Desktop/credentials_ppg.json --prog PPG --proj PPGTEST --profile poxdc"

# Debugging and Common Issues
1. Missing Required Columns
  Please confirm that the TSV file contains all required columns, especially the file_name, project, type, and submitter_id columns in the Datafile format.

2. Authentication Failure
  Confirm that the cred_path file is correct and that the API URL matches the profile configuration.
