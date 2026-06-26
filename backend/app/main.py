import logging
import time
import uuid
from fastapi import FastAPI, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.exceptions import MindGuardException
from app.api.v1.auth import router as auth_router
from app.api.v1.users import students_router, admin_router

# Setup standard structured logging configuration
logging.basicConfig(level=logging.INFO, format="%(levelname)s: [%(asctime)s] %(message)s")
logger = logging.getLogger("mindguard-api")

app = FastAPI(
    title="MindGuard API",
    description="Foundational backend infrastructure and security layer for the MindGuard wellness platform.",
    version="1.0.0"
)

# 1. Configure CORS Middleware
# Wildcards are disallowed; origins are restricted to configured values.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Configure Request ID and Timing Middleware
@app.middleware("http")
async def add_request_id_and_process_time(request: Request, call_next):
    # Unique Request UUID for transaction tracking (A09:2021-Security Logging and Monitoring Failures)
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    
    start_time = time.time()
    
    response: Response = await call_next(request)
    
    process_time = time.time() - start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{process_time:.4f}s"
    
    logger.info(
        f"Processed request: {request.method} {request.url.path} - status: {response.status_code} "
        f"- ID: {request_id} - time: {process_time:.4f}s"
    )
    
    return response

# 3. Register Global Exception Handlers
@app.exception_handler(MindGuardException)
async def mindguard_exception_handler(request: Request, exc: MindGuardException):
    """
    Handle domain-specific exceptions.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Handle request parameter validation errors (422 Unprocessable Entity).
    """
    details = {}
    for error in exc.errors():
        loc = " -> ".join(str(x) for x in error.get("loc", []))
        details[loc] = error.get("msg", "Validation error")

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error_code": "VALIDATION_ERROR",
            "message": "Validation failed for request parameters.",
            "details": details
        }
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """
    Handle relational database exceptions. Hides connection strings/queries from client details.
    """
    logger.error(f"SQLAlchemy Exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "A database error occurred while processing the request.",
            "details": {}
        }
    )

@app.exception_handler(Exception)
async def catch_all_exception_handler(request: Request, exc: Exception):
    """
    Catch-all for generic unhandled server exceptions (500 Internal Server Error).
    """
    logger.error(f"Unhandled Exception: {str(exc)}", exc_info=True)
    
    # In development, return the reason detail. In production, hide it.
    details = {}
    if settings.ENVIRONMENT == "development":
        details = {"reason": str(exc)}

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error_code": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected server error occurred.",
            "details": details
        }
    )

# 4. Mount Domain Routers with exact prefixes matching API.md
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(students_router, prefix="/api/v1/students", tags=["Students"])
app.include_router(admin_router, prefix="/api/v1/admin", tags=["Institution Administration"])
