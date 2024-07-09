# Build Table

This is a simple table builder from a json file.

## How to use

```shell
docker run -v $(pwd)/temp/:/templates/ wladimirguerra/csv-table-builder-alpine:latest --template=aws --key=services.s3.buckets /templates/mock_data.json /templates/output1.csv 
```
