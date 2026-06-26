from typing import Any, Dict, Optional
from fastapi import status

class MindGuardException(Exception):
    def __init__(
        self,
        error_code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Base custom exception class for all domain-specific errors.
        """
        self.error_code = error_code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

class UserNotFoundException(MindGuardException):
    def __init__(self, message: str = "User account not found.", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="USER_NOT_FOUND",
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details
        )

class EntityNotFoundException(MindGuardException):
    def __init__(self, entity_name: str, message: Optional[str] = None, details: Optional[Dict[str, Any]] = None):
        msg = message or f"{entity_name} record not found."
        super().__init__(
            error_code="NOT_FOUND",
            message=msg,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details
        )

class AuthenticationFailedException(MindGuardException):
    def __init__(self, message: str = "Authentication failed.", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            error_code="UNAUTHORIZED",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details
        )
