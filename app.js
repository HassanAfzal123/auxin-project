const express = require('express')
const fs = require('fs')
const csv = require('csv')
const csvParser = require('csv-parser')
const createCsvWriter = require('csv-writer').createObjectCsvWriter
const EOL = require('os').EOL
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
require('dotenv').config()

const app = express()

//this line is required to parse the request body
app.use(express.json())

// Swagger UI
app.use('/api-docs', swaggerUi.serve);

//Swagger route
app.get('/api-docs',swaggerUi.setup(swaggerDocument))

/* Create - POST method */
app.post('/data/add', async (req, res) => {
    
    //get the new user data from post request
    let covidDataArr = req.body

    //Validating the complete object array
    try {
        for(const covidData of covidDataArr) {
            //check if the userData fields are missing
            if (covidData.iso_code == null || covidData.continent == null || covidData.location == null || covidData.date == null) {
                return res.status(401).send({error: true, msg: 'Provided data is missing required fields'})
            }

            //Validate date format
            if(!isValidDate(covidData.date))
                return res.status(400).send({error: true, msg: 'Invalid date format'})
        }
    } catch (err) {
        return res.status(400).send({error: true, msg: 'Invalid data format'})
    }

    let responseObj = await addData(covidDataArr)
   
    if(responseObj.success) 
        res.status(200).send(responseObj)
    else
        res.status(500).send(responseObj)
})

/* Read - GET method */
app.get('/data/list/:rows', async (req, res) => {
    try {
        let rowsCount = req.params.rows
        let data = await listData(rowsCount)
        console.log("Rows fetched: "+rowsCount)
        res.json({success: true, data: data})
    } catch(err) {
        res.status(500).json({error: true, msg: err})
    }
})

/* Update - Patch method */
app.patch('/data/update', async (req, res) => {
    
    //get the location and date from query parameters
    let location = req.query.location
    let date = req.query.date

    //get the update data
    let covidUpdatedData = req.body

    //Validate date format
    if(!isValidDate(date) || !isValidDate(covidUpdatedData.date))
        return res.status(400).send({error: true, msg: 'Invalid date format'})

    //Checking required fields
    if (covidUpdatedData.iso_code == null || covidUpdatedData.continent == null || covidUpdatedData.location == null || covidUpdatedData.date == null) {
        return res.status(401).send({error: true, msg: 'Provided data is missing required fields'})
    }
    
    //Create transformation function
    csvHeaders = await getCsvHeaders()
    const transform = csv.transform((row, cb) => {        
        if(row[2].toLowerCase() === location.toLowerCase() && row[3] === date)
            for (const [header, value] of Object.entries(covidUpdatedData))
                if(csvHeaders.indexOf(header) !== -1)
                    row[csvHeaders.indexOf(header)] = value
        result = row.join(',') + EOL;
        cb(null, result);
    });

    //Pass transform function to update function
    responseObj = await updateDeleteData(transform) 
    
    if(responseObj.success)
        res.status(200).send(responseObj)
    else
        res.status(500).send(responseObj)
    
})

/* Delete - Delete method */
app.delete('/data/delete', async (req, res) => {

    //get the location and date from query parameters
    let location = req.query.location
    let date = req.query.date

    //Validate date format
    if(!isValidDate(date))
        return res.status(400).send({error: true, msg: 'Invalid date format'})
    
    //Create transformation function
    const transform = csv.transform((row, cb) => {        
        result = row.join(',') + EOL;
        if(row[2].toLowerCase() === location.toLowerCase() && row[3] === date) {
            result = null  
        }

        cb(null, result);
    });

    //Pass transform function to update function
    responseObj = await updateDeleteData(transform) 
    
    if(responseObj.success)
        res.status(200).json(responseObj)
    else
        res.status(500).json(err)

    
})



// Util functions //

//get the covid data rows from CSV file
const listData = (rowsToFetch) => {
    var csvStream = csvParser()
    var fileStream = fs.createReadStream(process.env.mainFile)

    let data = []
    let rowCount = 0
    let stopReading = false

    return new Promise((resolve, reject) => {
        let doneReading = () => {
            fileStream.destroy()
            resolve(data)
        }

        csvStream.on('data', (row) => {
            if(!stopReading) {
                if(rowsToFetch === "all") {
                    data.push(row)
                } else {

                    if(rowCount < rowsToFetch) {
                        data.push(row)
                        rowCount++
                    } 

                    if(rowCount >= rowsToFetch)
                        stopReading = true
                        csvStream.emit('end')
                }
            }
        })

        csvStream.on('end', doneReading)

        csvStream.on('error', (err) => {
            reject(err)
        })

        fileStream.pipe(csvStream)
    })
}

const getCsvHeaders = () => {
    let csvStream = csvParser()
    let fileStream = fs.createReadStream(process.env.mainFile)
    
    return new Promise((resolve) => {

        csvStream.on('headers', (headers) => {
            fileStream.destroy()
            resolve(headers)
        })
        fileStream.pipe(csvStream)
    })

}

const addData = async (covidDataArr) => {

    //Initializing csv headers
    const csvHeaders = await getCsvHeaders()

    let headerArr = []
    for(const header of csvHeaders) {
        headerArr.push({id: header, title: header})
    }

    //open create stream
    const csvWriter = createCsvWriter({
        path: process.env.mainFile,
        header: headerArr,
        append: true
    });
    
    try {
        await csvWriter.writeRecords(covidDataArr)
        return {success: true, msg: 'Covid data added successfully'}
    } catch (err) {
        return {error: true, msg: err}
    }
}

const updateDeleteData = async (transform) => {

    mainFile = process.env.mainFile
    tempFile = process.env.tempFile

    let readStream = fs.createReadStream(mainFile)
    let writeStream = fs.createWriteStream(tempFile)

    return new Promise((resolve) => {
        writeStream.on('finish', async () => {
            try {
                writeStream.end()
                fs.unlinkSync(mainFile)
                fs.renameSync(tempFile,mainFile)
                resolve({success: true, message: "Covid data updated/deleted successfully"})
            } catch(err) {
                fs.unlinkSync(tempFile)
                resolve({error: true, message: err})       
            }                    
        })

        writeStream.on('error',() => {
            resolve({error: true, message: err})
        })

        readStream.on('error', (err) => {
            resolve({error: true, message: err})
        })

        readStream.on('finish', async () => {
            await readStream.end()
        })

        readStream.pipe(csv.parse()).pipe(transform).pipe(writeStream)
    })
}

const isValidDate = (dateString) => {
    var regEx = /^\d{4}-\d{2}-\d{2}$/;
    return dateString.match(regEx) != null;
}

//configure the server port
app.listen(process.env.PORT, () => {
    console.log('Server is running on port',process.env.PORT)
})