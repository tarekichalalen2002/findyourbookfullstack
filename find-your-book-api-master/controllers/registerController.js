const catchAsyncErrors = require('../utils/catchAsyncErrors');
const driver = require('../neo4j');
const AppError = require('../utils/appError');
const bcrypt = require("bcrypt");


exports.register = catchAsyncErrors(async (req,res,next) => {
    const session = await driver.session({database:"neo4j"});
    try{
        const {
            firstName, 
            lastName, 
            email, 
            password,
            picturePath,
            bio,
        } = req.body;
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(password, salt);
        const createdReader = await session.executeWrite(tx =>  
            tx.run(
                `CREATE (r:Reader {first_name:"${firstName}", last_name:"${lastName}",
                email:"${email}" ,password:"${passwordHash}", picture:"${picturePath}" , bio:"${bio}" , createdAt:timestamp()})
                RETURN r;`
            )
        );
        res.status(201).json({
            status:'success',
            message:'Your account has been created successfuly',
        })
    }

    catch (e) { 
        // return next(new AppError('Internal server error',500))
        res.status(401).json({msg:e})
    }
    finally {
        await session.close()
    }  
})

