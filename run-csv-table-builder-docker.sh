#!bin/sh

docker run -v "$3":/templates/ wladimirguerra/csv-table-builder-alpine:latest -v "$4":/data/ -v "$5":/output/ --template="$1" --key="$2" /data/"$6" /output/"$7"
