const express = require('express');
const morgan = require('morgan');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const {verifyToken} = require("./middleware/auth")

const bookRouter = require('./routes/bookRoutes');
const authorRouter = require('./routes/authorRoutes');
const readerRouter = require('./routes/readerRoutes');
const genreRouter = require('./routes/genreRoutes');
const statisticRouter = require('./routes/statisticRoutes');
const recommendationRouter = require('./routes/recommendationRoutes');
const avatarRouter = require('./routes/avatarRoutes');
const loginRouter = require('./routes/loginRoutes.js');
const registerRouter = require('./routes/registerRoutes.js');

const app = express();

app.use(express.json());
app.use(express.static(`${__dirname}/public`));
app.use(cors());

if(process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'));
}


//routes 
app.use('/api/v1/books',verifyToken,bookRouter);
app.use('/api/v1/readers',verifyToken,readerRouter);
app.use('/api/v1/authors',verifyToken,authorRouter);
app.use('/api/v1/genres',verifyToken,genreRouter);
app.use('/api/v1/statistics',verifyToken,statisticRouter);
app.use('/api/v1/recommendations',verifyToken,recommendationRouter);
app.use('/api/v1/avatars',verifyToken,avatarRouter);
app.use('/api/v1/login' , loginRouter);
app.use('/api/v1/register',registerRouter);


app.all('*', (req,res,next)=>{
    next(new AppError(`can't find ${req.originalUrl}`, 404));
});

//middle ware for handling errors
app.use(globalErrorHandler);

module.exports = app;