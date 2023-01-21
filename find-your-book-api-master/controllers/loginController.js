const catchAsyncErrors = require('../utils/catchAsyncErrors');
const driver = require('../neo4j');
const AppError = require('../utils/appError');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


exports.login = catchAsyncErrors(async (req,res,next) => {
    const session = await driver.session({database:"neo4j"});
    try{
        const {email , password} = req.body;
        
        const result = await session.executeRead(tx => 
            tx.run(
                `MATCH (user:Reader) WHERE user.email="${email}" RETURN user;`
            )
        )
        if (result.records.length == 0) return res.status(400).json({msg:"invalid email"});
        console.log(result.records[0]._fields[0].identity.low);
        userId =result.records[0]._fields[0].identity.low
        userPorps = result.records[0]._fields[0].properties
        user = {userId,userPorps}
        
        const isMatch = await bcrypt.compare(password , user.userPorps.password);

        if(!isMatch) return res.status(401).json({msg:'invalid password'});

        const token = jwt.sign({id:user.id},process.env.JWT_SECRET,{
            expiresIn:'30d',
        })
        delete user.password;
        res.status(201).json({token , user});
    }
    catch (e) {
        return next(new AppError('Internal server error',500))
        }
    finally {
        await session.close()
    }  
})