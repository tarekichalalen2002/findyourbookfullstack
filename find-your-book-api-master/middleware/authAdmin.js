const jwt = require("jsonwebtoken");

exports.verifyToken = async (req,res,next) => {
    try{
        let token = req.header("Authorization");
        if(!token){
            return res.status(403).send("Access Denied");
        }
        if(token.startsWith("Admin ")){
            token = token.slice(6 , token.length).trimLeft();
        }
        const verified = jwt.verify(token , process.env.JWT_SECRET_ADMIN);
        req.user = verified;
        next();
    }
    catch (error){
        res.status(500).json({error:err.message});
    }
} 