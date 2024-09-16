const errorMiddleware = (err, req, res, next) => {
  // console.log(err);
  let statusCode =
    err.statusCode && Number.isInteger(err.statusCode) ? err.statusCode : 500;
  let message =
    err.message && typeof err.message === "string"
      ? err.message
      : "Internal Server Error";

      if(err.code === 11000){
        const error =  Object.keys(err.keyPattern).join(",");
        message = ` Duplicate entries found for - ${error}`;
        statusCode = 400;
      }

      // if(err.name === "CastError" && err.kind === "ObjectId")
      if(err.name === "CastError" ){
        const errorPath = err.path
        message = `Invalid format for ${errorPath} in request, expected valid ObjectId`;
        statusCode = 400;
      }
  return res.status(statusCode).json({
    success: false,
    message: message,
  });
};

const tryCatch = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    next(error);
  }
};

export { errorMiddleware, tryCatch };
