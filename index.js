require('dotenv').config();
const express = require('express')
const fileUpload = require('express-fileupload')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const router = require('./router/index')
const errorMiddleware = require("./middlewares/error-middleware")

const PORT = process.env.PORT || 4000
const app = express()

app.use(fileUpload({}));
app.use(express.json());
app.use(cookieParser());
const allowedOrigins = process.env.CLIENT_URL.split(',');
app.use(cors({
    credentials: true,
    // origin: '*'
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));
app.use("/api", router)
app.use(errorMiddleware)

const start = async () => {
    try {
        await mongoose.connect(process.env.DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        })
        app.listen(PORT, () => console.log(`server started on port ${PORT}`))
    } catch (e) {
        console.log(e)
    }
}

start()