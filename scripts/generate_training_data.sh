#!/bin/sh
# Created by Pye 6/17/2015

##
## generate_training_data:
##
## Generate training data from either pdf or tif.
## A copy of inputfile and box file will be incrementally added to the
##  trainingData folder in the same directory as the script
##
## Usage: generate_training_data.sh [inputFile]
##
## Where: inputFile is a pdf or tif file
##

if [[ ( $1 == "--help") ||  $1 == "-h" ]]
then
    echo $(grep "^##" "${BASH_SOURCE[0]}" | cut -c 4- | awk '{print $0,"\\n"}')
		exit 0
fi

set -e

inputFile=$1
inputFullFileName=$(basename "$inputFile")
inputFileName="${inputFullFileName%.*}"
extension="${inputFullFileName##*.}"

tifFiles=($inputFile)
if [ $extension == "pdf" ]
then
    mkdir -p tmp
    pdftk $inputFile burst output tmp/page%05d.pdf
    tifFiles=()
    for pdfFileName in tmp/*.pdf; do
        tifBaseName=$(basename $pdfFileName)
        tifFileName=tmp/${tifBaseName%.*}.tif
        gs -sDEVICE=tiffgray -r300 -dTextAlphaBits=4 -o $tifFileName $pdfFileName
        echo $tifFileName
        tifFiles=("${tifFiles[@]}" "$tifFileName")
    done
fi

for tifFile in "${tifFiles[@]}"
do
    n=1;
    while [ -f `printf trainingData/exp%05d.tif $n` ]; do
        ((++n));
    done;
    name=`printf exp%05d $n`

    mkdir -p trainingData
    cp $tifFile trainingData/$name.tif
    tesseract trainingData/$name.tif trainingData/$name batch.nochop makebox
done
exit 0
