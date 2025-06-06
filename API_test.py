import sys
import os, subprocess
import pandas as pd
import numpy as np
import pydicom
from PIL import Image
import glob
#import gdcm
#import pylibjpeg

# import some Gen3 packages
import gen3
from gen3.auth import Gen3Auth
from gen3.query import Gen3Query

api = "https://dev.toxdatacommon.com"
cred = "/Users/kejiyuan/Desktop/credentials_dev.json"

auth = Gen3Auth(api, refresh_file=cred) 
query = Gen3Query(auth)

