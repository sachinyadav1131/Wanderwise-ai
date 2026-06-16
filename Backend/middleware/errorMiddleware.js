class ErrorHandler extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        // Captures the stack trace to help with debugging in development
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorMiddleware = (err, req, res, next) => {
    err.message = err.message || "Internal Server Error";
    err.statusCode = err.statusCode || 500;

    // Mongoose Duplicate Key Error
    if (err.code === 11000) {
        const message = `Duplicate ${Object.keys(err.keyValue)} entered.`;
        err = new ErrorHandler(message, 400);
    }

    // Wrong JWT Error
    if (err.name === "JsonWebTokenError") {
        const message = `JSON Web Token is invalid. Try Again.`;
        err = new ErrorHandler(message, 400);
    }

    // JWT Expire Error
    if (err.name === "TokenExpiredError") {
        const message = `JSON Web Token has expired. Try Again.`;
        err = new ErrorHandler(message, 400);
    }

    // Wrong Mongoose Object ID Error (CastError)
    if (err.name === "CastError") {
        const message = `Resource not found. Invalid: ${err.path}`;
        err = new ErrorHandler(message, 400);
    }

    // Mongoose Validation Error (extracts all validation messages into a single string)
    const errorMessage = err.errors 
        ? Object.values(err.errors).map(error => error.message).join(", ")
        : err.message;

    return res.status(err.statusCode).json({
        success: false,
        message: errorMessage,
    });
};

export default ErrorHandler;