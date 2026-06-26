---
name: Enterprise_Enforcer
description: Generates production-ready, strictly typed, SOLID-compliant code in TypeScript and Python (Pydantic) with comprehensive error handling to prevent immediate refactoring.
---

# Enterprise_Enforcer Skill

Ensure that all generated code is strictly enterprise-ready, robust, type-safe, and architecturally sound from the first iteration.

## 1. Strict Typing Standards

### A. TypeScript
- **No `any` or `implicit any`**: Every parameter, return type, and variable must have an explicit, precise type. Use `unknown` if the type is truly dynamic, followed by explicit type guards or assertion functions.
- **Strict Mode Compliance**: Assume compiler flags like `strictNullChecks`, `noImplicitAny`, and `strictBindCallApply` are enabled.
- **Discriminated Unions**: Prefer discriminated unions over optional fields or overloading for representing complex, mutually exclusive states.
- **Immutability**: Use `readonly` for array and object types where data should not be mutated.
- **Interfaces vs. Types**: Use `interface` for structural definitions that are open to extension, and `type` for unions, intersections, and mapped types.

Example:
```typescript
interface SuccessResponse<T> {
  readonly status: 'success';
  readonly data: T;
}

interface ErrorResponse {
  readonly status: 'error';
  readonly error: {
    readonly message: string;
    readonly code: string;
  };
}

type APIResponse<T> = SuccessResponse<T> | ErrorResponse;
```

### B. Python & Pydantic (v2)
- **Strict Variable Typing**: Ensure all functions, variables, and arguments have precise type annotations from the `typing` module (e.g., `Optional`, `Union`, `Sequence`, `Mapping`).
- **Pydantic Validation**: Use Pydantic models for data parsing and validation at boundaries.
- **Strict Parsing Configurations**: Set `model_config = ConfigDict(extra="forbid", strict=True)` to reject unmapped fields and prevent silent type coercion.
- **Advanced Validators**: Use `@field_validator` and `@model_validator` for cross-field assertions and domain validations.
- **Descriptive Field Metadata**: Document fields using `Field(..., description="...")` and configure appropriate validation constraints (e.g., `gt`, `lt`, `min_length`).

Example:
```python
from typing import Annotated
from pydantic import BaseModel, Field, ConfigDict, field_validator

class UserCreateDTO(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    
    username: Annotated[str, Field(min_length=3, max_length=50, description="Unique username")]
    email: Annotated[str, Field(pattern=r"^\S+@\S+\.\S+$", description="Primary email address")]
    age: Annotated[int, Field(ge=18, le=120, description="User age in years")]

    @field_validator("username")
    @classmethod
    def validate_username_safe(cls, v: str) -> str:
        if not v.isalnum():
            raise ValueError("Username must be alphanumeric")
        return v
```

---

## 2. Comprehensive Error Handling

- **Never Swallow Errors**: Always catch specific errors or re-throw them with enriched context. Never use empty catch/except blocks.
- **Structured Error Return Types**: For expected failures, use patterns like the `Either` monad or tuple-based success/error returns (e.g., `[result, error]`) instead of throwing/raising exceptions.
- **Domain-Specific Exceptions**: Inherit from base custom exceptions to represent business logic failures (e.g., `ApplicationError`, `EntityNotFoundException`).
- **Resource Cleanup**: Ensure proper resource cleanup via `try...finally` (TS) or `with` statements (Python) for file handles, database connections, and locks.
- **Defensive Design**: Validate parameters at entry points and check pre-conditions before performing destructive actions.

---

## 3. SOLID Design Implementation Checklist

- **Single Responsibility Principle (SRP)**:
  - Every class, function, or module must have exactly one reason to change.
  - Break down large classes into specialized services (e.g., separating database persistence, business validation, and email notification).
- **Open/Closed Principle (OCP)**:
  - Code should be open for extension but closed for modification.
  - Use interfaces (TS) or abstract base classes (Python) to define behaviors that can be extended by new implementations without changing the calling code.
- **Liskov Substitution Principle (LSP)**:
  - Derived classes or implementations must be completely substitutable for their base classes or interfaces without breaking client code.
  - Subclasses must not restrict the behavior or strengthen preconditions of the parent class.
- **Interface Segregation Principle (ISP)**:
  - Keep interfaces small, cohesive, and client-specific.
  - Do not force clients to implement methods they do not need.
- **Dependency Inversion Principle (DIP)**:
  - High-level modules must not depend on low-level modules; both must depend on abstractions.
  - Use Dependency Injection (DI) to pass dependencies into constructors rather than hardcoding instantiations inside the class.

---

## 4. Code Quality & Refactoring Guardrails

- **Do Not Use Placeholders**: Write fully functional, complete logic. Avoid comments like `// TODO: Implement later` or `pass # Logic goes here`.
- **Modular and Dry**: Keep functions small (under 30 lines is preferred). Extract complex nested loops or conditions into descriptive helper functions.
- **Document Decisions**: Use clean, informative inline comments to explain "why" a design choice was made, rather than just "what" the code does. Add descriptive docstrings / JSDoc blocks to all public APIs.
