#!/bin/sh
# Created by Pye 6/17/2015

##
## train:
##
## First make sure that the training examples are in trainingData folder
## A training example is a pair of tif and box file in the form of
## exp#####.tif and exp#####.box
##
## To generate a training example,
## Run ./make_box.sh <input_tif_file>
##
## Run the script to generate trained data
##
## Usage: train.sh
##

if [[ ( $1 == "--help") ||  $1 == "-h" ]]
then
    echo $(grep "^##" "${BASH_SOURCE[0]}" | cut -c 4- | awk '{print $0,"\\n"}')
		exit 0
fi

set -e
language="eng"
fontName="picnichealth"
trainingDataDir="./trainingData"

# create temporary file
tmpDir="tmp"
mkdir -p $tmpDir

# generate font properties
echo "$fontName 0 0 0 0 0" > $tmpDir/font_properties
echo "Generated font properties"

# copy training data to temporary file
boxFiles=()
trainFiles=()
for fileName in $trainingDataDir/*.tif; do
    tifFullFileName=$(basename "$fileName")
    exp="${tifFullFileName%.*}"

    trainFile=$tmpDir/$language.$fontName.$exp
    tesseract $fileName $trainFile nobatch box.train
    echo "Generated train file for $exp"

    boxFiles=("${boxFiles[@]}" "$trainingDataDir/$exp.box")
    trainFiles=("${trainFiles[@]}" "$trainFile.tr")
done

# generate unicharset file in tmp directory
unicharset_extractor -D $tmpDir $(printf " %s" "${boxFiles[@]}")
echo "Generated unicharset"

mftraining -F $tmpDir/font_properties -U $tmpDir/unicharset -O $tmpDir/lang.unicharset -D $tmpDir $(printf " %s" "${trainFiles[@]}")
echo "Completed mftraning"

# character normalizationing training
cntraining -F $tmpDir/font_properties -U $tmpDir/unicharset -O $tmpDir/lang.unicharset -D $tmpDir $(printf " %s" "${trainFiles[@]}")
echo "Completed cntraining"

cp $tmpDir/unicharset $tmpDir/$fontName.unicharset
cp $tmpDir/normproto $tmpDir/$fontName.normproto
cp $tmpDir/inttemp $tmpDir/$fontName.inttemp
cp $tmpDir/pffmtable $tmpDir/$fontName.pffmtable
cp $tmpDir/shapetable $tmpDir/$fontName.shapetable

cd $tmpDir
combine_tessdata $fontName.
mkdir -p  ../trainedData
mv $fontName.trainedData ../trainedData/$fontName.trainedData
cd ..
rm -rf $tmpDir
exit 0
