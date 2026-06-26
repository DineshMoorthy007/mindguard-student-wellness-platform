# API.md

## 1. Global Specifications

* **Base URL:** `/api/v1`
* **Content-Type:** `application/json` (except where multipart/form-data is specified)
* **Authentication:** All secured endpoints require a JWT Bearer token in the `Authorization` header (`Authorization: Bearer <token>`).
* **Standard Error Response:**
```json
{
  "error_code": "STRING_CODE",
  "message": "Human readable error description",
  "details": {} 
}

```



---

## 2. Authentication API

### 2.1 Register User

* **URL:** `/auth/register`
* **Method:** `POST`
* **Authentication:** None
* **Validation:** Email must be valid format, password minimum 8 characters. Role must be valid.
* **Request:**
```json
{
  "email": "student@university.edu",
  "password": "securepassword123",
  "role": "STUDENT"
}

```


* **Response (201 Created):**
```json
{
  "id": "u-1111-2222-3333-4444",
  "email": "student@university.edu",
  "role": "STUDENT"
}

```


* **Error Codes:** `400 BAD_REQUEST` (Invalid input), `409 CONFLICT` (Email already exists).

### 2.2 Login

* **URL:** `/auth/login`
* **Method:** `POST`
* **Authentication:** None
* **Validation:** Requires valid email and string password.
* **Request:**
```json
{
  "email": "student@university.edu",
  "password": "securepassword123"
}

```


* **Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5...",
  "refresh_token": "def50200234234234...",
  "token_type": "bearer",
  "expires_in": 3600
}

```


* **Error Codes:** `401 UNAUTHORIZED` (Invalid credentials).

---

## 3. Student API

### 3.1 Get Student Profile

* **URL:** `/students/me`
* **Method:** `GET`
* **Authentication:** Required (Role: `STUDENT`)
* **Request:** Empty
* **Response (200 OK):**
```json
{
  "id": "u-1111-2222-3333-4444",
  "email": "student@university.edu",
  "created_at": "2026-06-25T08:00:00Z"
}

```


* **Error Codes:** `401 UNAUTHORIZED`, `404 NOT_FOUND`.

---

## 4. Counselor API

### 4.1 Get Active Alerts

* **URL:** `/counselors/alerts`
* **Method:** `GET`
* **Authentication:** Required (Role: `COUNSELOR`)
* **Validation:** Optional query params `?status=PENDING&limit=50`.
* **Request:** Empty
* **Response (200 OK):**
```json
{
  "alerts": [
    {
      "id": "al-404-505-606",
      "student_id": "u-1111-2222-3333-4444",
      "assessment_id": "a-303-404-505",
      "status": "PENDING",
      "created_at": "2026-06-26T14:21:06Z"
    }
  ],
  "total": 1
}

```


* **Error Codes:** `401 UNAUTHORIZED`, `403 FORBIDDEN`.

### 4.2 Update Alert Status

* **URL:** `/counselors/alerts/{alert_id}`
* **Method:** `PUT`
* **Authentication:** Required (Role: `COUNSELOR`)
* **Validation:** `status` must be `REVIEWED` or `RESOLVED`.
* **Request:**
```json
{
  "status": "REVIEWED"
}

```


* **Response (200 OK):**
```json
{
  "id": "al-404-505-606",
  "status": "REVIEWED",
  "counselor_id": "u-2222-3333-4444-5555"
}

```


* **Error Codes:** `400 BAD_REQUEST`, `404 NOT_FOUND`.

---

## 5. Admin API

### 5.1 Get User Directory

* **URL:** `/admin/users`
* **Method:** `GET`
* **Authentication:** Required (Role: `ADMIN`)
* **Validation:** Query params `?role=STUDENT&page=1`
* **Request:** Empty
* **Response (200 OK):**
```json
{
  "users": [
    {
      "id": "u-1111-2222-3333-4444",
      "email": "student@university.edu",
      "role": "STUDENT",
      "is_active": true
    }
  ],
  "page": 1,
  "total_pages": 15
}

```


* **Error Codes:** `401 UNAUTHORIZED`, `403 FORBIDDEN`.

---

## 6. Mood Tracking API

### 6.1 Get Mood History

* **URL:** `/mood/history`
* **Method:** `GET`
* **Authentication:** Required (Role: `STUDENT`)
* **Validation:** Query param `?timeframe=7d` or `30d`.
* **Request:** Empty
* **Response (200 OK):**
```json
{
  "history": [
    {
      "id": "m-101",
      "input_type": "TEXT",
      "self_reported_score": 3,
      "logged_at": "2026-06-26T14:20:00Z"
    }
  ]
}

```


* **Error Codes:** `401 UNAUTHORIZED`.

---

## 7. Journal API

### 7.1 Submit Text Journal Entry

* **URL:** `/journal/entries`
* **Method:** `POST`
* **Authentication:** Required (Role: `STUDENT`)
* **Validation:** `content` cannot be empty. Max length 5000 chars. `score` between 1-10.
* **Request:**
```json
{
  "content": "I feel overwhelmed by my midterms.",
  "self_reported_score": 3
}

```


* **Response (202 Accepted):** *(Async Processing triggered)*
```json
{
  "mood_log_id": "m-101",
  "status": "processing",
  "message": "Journal entry saved. Analysis in progress."
}

```


* **Error Codes:** `400 BAD_REQUEST`, `422 UNPROCESSABLE_ENTITY`.

---

## 8. Clinical Surveys (PHQ-9 & GAD-7) API

### 8.1 Submit PHQ-9 Survey

* **URL:** `/surveys/phq-9`
* **Method:** `POST`
* **Authentication:** Required (Role: `STUDENT`)
* **Validation:** Must contain exactly 9 integer responses (values 0-3).
* **Request:**
```json
{
  [cite_start]"responses": [1, 1, 1, 2, 2, 3]
}

```


* **Response (201 Created):**
```json
{
  "survey_id": "s-999",
  "total_score": 10,
  "severity": "Moderate Depression",
  "logged_at": "2026-06-26T15:00:00Z"
}

```


* **Error Codes:** `400 BAD_REQUEST` (Invalid array length or values).

### 8.2 Submit GAD-7 Survey

* **URL:** `/surveys/gad-7`
* **Method:** `POST`
* **Authentication:** Required (Role: `STUDENT`)
* **Validation:** Must contain exactly 7 integer responses (values 0-3).
* **Request:**
```json
{
  [cite_start]"responses": [1, 1, 2, 2, 2, 3]
}

```


* **Response (201 Created):**
```json
{
  "survey_id": "s-777",
  "total_score": 11,
  "severity": "Moderate Anxiety",
  "logged_at": "2026-06-26T15:05:00Z"
}

```


* **Error Codes:** `400 BAD_REQUEST`.

---

## 9. Predictions API

### 9.1 Get Latest Assessment / Prediction

* **URL:** `/predictions/assessment/latest`
* **Method:** `GET`
* **Authentication:** Required (Role: `STUDENT` or `COUNSELOR`)
* **Validation:** If Counselor, must append `?student_id={id}`.
* **Request:** Empty
* **Response (200 OK):**
```json
{
  "assessment_id": "a-303",
  "mental_wellness_score": 32.5,
  "risk_level": "HIGH",
  "emotions_detected": {
    "anxiety": 0.85,
    "sadness": 0.60
  },
  "evaluated_at": "2026-06-26T14:21:05Z"
}

```


* **Error Codes:** `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`.

---

## 10. Recommendations API

### 10.1 Get Wellness Recommendations

* **URL:** `/recommendations/current`
* **Method:** `GET`
* **Authentication:** Required (Role: `STUDENT`)
* **Validation:** Resolves based on the user's latest `risk_level`.
* **Request:** Empty
* **Response (200 OK):**
```json
{
  "risk_level": "MEDIUM",
  "activities": [
    {
      "type": "MINDFULNESS",
      "title": "5-Minute Breathing Exercise",
      "url": "https://cdn.mindguard.edu/media/breathe.mp4"
    },
    {
      "type": "ARTICLE",
      "title": "Managing Academic Burnout",
      "url": "https://mindguard.edu/resources/burnout"
    }
  ]
}

```


* **Error Codes:** `401 UNAUTHORIZED`.

---

## 11. Analytics API

### 11.1 Get Institution Wellness Report

* **URL:** `/analytics/institution/reports`
* **Method:** `GET`
* **Authentication:** Required (Role: `ADMIN`)
* **Validation:** Optional query params `?start_date=2026-01-01&end_date=2026-06-26`.
* **Request:** Empty
* **Response (200 OK):**
```json
{
  "total_students_monitored": 1500,
  "average_wellness_score": 68.4,
  "risk_distribution": {
    "LOW": 60,
    "MEDIUM": 25,
    "HIGH": 15
  },
  "dominant_campus_emotion": "anxiety"
}

```


* **Error Codes:** `401 UNAUTHORIZED`, `403 FORBIDDEN`.

---

## 12. Notifications API

### 12.1 Get Unread Notifications

* **URL:** `/notifications`
* **Method:** `GET`
* **Authentication:** Required (Role: `STUDENT` or `COUNSELOR`)
* **Request:** Empty
* **Response (200 OK):**
```json
{
  "notifications": [
    {
      "id": "n-808",
      "type": "COUNSELOR_REACHOUT",
      "message": "Counselor Clara has requested a check-in meeting.",
      "is_read": false,
      "created_at": "2026-06-26T14:30:00Z"
    }
  ]
}

```


* **Error Codes:** `401 UNAUTHORIZED`.

### 12.2 Mark Notification as Read

* **URL:** `/notifications/{id}/read`
* **Method:** `PUT`
* **Authentication:** Required (Role: `STUDENT` or `COUNSELOR`)
* **Validation:** `id` must be a valid UUID owned by the requester.
* **Request:** Empty
* **Response (200 OK):**
```json
{
  "id": "n-808",
  "is_read": true
}

```


* **Error Codes:** `401 UNAUTHORIZED`, `404 NOT_FOUND`.