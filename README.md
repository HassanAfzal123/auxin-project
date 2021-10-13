# Auxin-project

This project contains CRUD operations RESTful-Apis on the Covid Dataset.

## Dependencies

- express (https://www.npmjs.com/package/express)
- csv (https://www.npmjs.com/package/csv)
- csv-parser (https://www.npmjs.com/package/csv-parser)
- csv-writer (https://www.npmjs.com/package/csv-writer)
- dotenv (https://www.npmjs.com/package/dotenv)
- swagger-ui-express (https://www.npmjs.com/package/swagger-ui-express)

## Install npm modules

- npm install

## Start the script

- npm start

## Dataset Used

- Covid dataset: (https://github.com/owid/covid-19-data/blob/master/public/data/owid-covid-data.csv)

## Swagger

- To visualize the RESTful Apis, swagger ui is added on route (/api-docs)

## Testing Tools

- Swagger and Postman are used for testing all the Apis

## Approaches Used

- To make the Api(s) memory efficient, streams are used. Not all data is stored in memory but chunk of data is handled so even large data files can be handled easily.

- Safe file handling approach is used. Old file data is not removed until update/delete operations are not conducted properly.

- Reusability coding approach is used. Functions are created to avoid code redundancy.
