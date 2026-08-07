"""Pydantic models — the API contract.

Every request and response body is validated here. Nothing reaches a service function
unvalidated, regardless of what the client claims to have checked.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, Field, field_validator

T = TypeVar("T")


# ─── Envelope ────────────────────────────────────────────────────────────────


class ErrorDetail(BaseModel):
    """Machine-readable code plus a translatable message key.

    The raw message is English for developers; clients localise from `code`.
    Stack traces and internal detail never cross this boundary.
    """

    code: str
    message: str
    field: str | None = None


class Envelope(BaseModel, Generic[T]):
    data: T | None = None
    error: ErrorDetail | None = None
    meta: dict[str, Any] = Field(default_factory=dict)


# ─── Enums (mirrors frontend/types/index.ts) ─────────────────────────────────


class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"


class Area(str, Enum):
    rural = "rural"
    urban = "urban"


class Category(str, Enum):
    general = "general"
    sc = "sc"
    st = "st"
    obc = "obc"
    ews = "ews"
    minority = "minority"


class Occupation(str, Enum):
    farmer = "farmer"
    student = "student"
    salaried = "salaried"
    self_employed = "self-employed"
    daily_wage = "daily-wage"
    homemaker = "homemaker"
    unemployed = "unemployed"
    retired = "retired"
    artisan = "artisan"


class MatchLevel(str, Enum):
    eligible = "eligible"
    verify = "verify"
    not_eligible = "not-eligible"


class IssueSeverity(str, Enum):
    blocker = "blocker"
    warning = "warning"
    info = "info"


# ─── Citizen ─────────────────────────────────────────────────────────────────


class CitizenProfile(BaseModel):
    id: str = "anonymous"
    name: str = Field(min_length=1, max_length=120)
    age: int = Field(ge=0, le=120)
    gender: Gender
    state: str = Field(min_length=1, max_length=60)
    district: str = Field(min_length=1, max_length=60)
    area: Area
    occupation: Occupation
    annual_income: int = Field(ge=0, le=100_000_000, alias="annualIncome")
    category: Category
    family_size: int = Field(default=1, ge=1, le=30, alias="familySize")
    has_disability: bool = Field(default=False, alias="hasDisability")
    disability_percent: int | None = Field(default=None, ge=0, le=100, alias="disabilityPercent")
    land_holding_hectares: float | None = Field(
        default=None, ge=0, le=10_000, alias="landHoldingHectares"
    )
    existing_benefits: list[str] = Field(default_factory=list, alias="existingBenefits")
    life_events: list[str] = Field(default_factory=list, alias="lifeEvents")

    model_config = {"populate_by_name": True}

    @field_validator("disability_percent")
    @classmethod
    def _disability_consistency(cls, v: int | None, info) -> int | None:
        # A disability percentage without the flag set is almost always a client bug;
        # rejecting it here stops a silently wrong eligibility result downstream.
        if v is not None and not info.data.get("has_disability", False):
            raise ValueError("disabilityPercent requires hasDisability to be true")
        return v


# ─── Eligibility ─────────────────────────────────────────────────────────────


class RuleResult(BaseModel):
    label: str
    passed: bool
    soft: bool = False


class EligibilityResult(BaseModel):
    scheme_id: str = Field(alias="schemeId")
    level: MatchLevel
    score: int
    passed: list[RuleResult]
    failed: list[RuleResult]
    reason: str

    model_config = {"populate_by_name": True}


class SchemeSummary(BaseModel):
    id: str
    name: str
    short_name: str = Field(alias="shortName")
    ministry: str
    sector: str
    level: str
    tagline: str
    benefit_headline: str = Field(alias="benefitHeadline")
    processing_days: int = Field(alias="processingDays")
    official_url: str = Field(alias="officialUrl")
    icon: str
    accent: str

    model_config = {"populate_by_name": True}


class Recommendation(BaseModel):
    scheme: SchemeSummary
    result: EligibilityResult


class EligibilityRequest(BaseModel):
    profile: CitizenProfile
    scheme_id: str | None = Field(default=None, alias="schemeId")

    model_config = {"populate_by_name": True}


class RecommendRequest(BaseModel):
    profile: CitizenProfile
    limit: int = Field(default=10, ge=1, le=50)
    sector: str | None = None
    include_ineligible: bool = Field(default=False, alias="includeIneligible")

    model_config = {"populate_by_name": True}


# ─── Documents ───────────────────────────────────────────────────────────────


class StoredDocument(BaseModel):
    id: str
    name: str
    type: str
    owner_id: str = Field(alias="ownerId")
    verified: bool = False
    source: Literal["upload", "digilocker", "csc"] = "upload"
    expires_at: str | None = Field(default=None, alias="expiresAt")
    # OCR output: name, dob, address, gender, idNumber, fatherName
    extracted: dict[str, str] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class VerificationIssue(BaseModel):
    id: str
    severity: IssueSeverity
    field: str
    document_ids: list[str] = Field(alias="documentIds")
    title: str
    detail: str
    suggestion: str
    recommended_value: str | None = Field(default=None, alias="recommendedValue")
    confidence: int

    model_config = {"populate_by_name": True}


class CanonicalValue(BaseModel):
    value: str
    source_doc_id: str = Field(alias="sourceDocId")
    agreement: int

    model_config = {"populate_by_name": True}


class VerificationReport(BaseModel):
    documents_checked: int = Field(alias="documentsChecked")
    fields_compared: int = Field(alias="fieldsCompared")
    consistency_score: int = Field(alias="consistencyScore")
    ready_to_submit: bool = Field(alias="readyToSubmit")
    issues: list[VerificationIssue]
    canonical_values: dict[str, CanonicalValue] = Field(alias="canonicalValues")
    summary: str

    model_config = {"populate_by_name": True}


class VerifyRequest(BaseModel):
    profile: CitizenProfile
    documents: list[StoredDocument] = Field(default_factory=list)
    scheme_id: str | None = Field(default=None, alias="schemeId")

    model_config = {"populate_by_name": True}


class ChecklistItem(BaseModel):
    id: str
    name: str
    status: Literal["have", "missing", "expiring"]
    detail: str


# ─── Assistant ───────────────────────────────────────────────────────────────


class AskRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    profile: CitizenProfile
    locale: str = "en"

    @field_validator("locale")
    @classmethod
    def _supported_locale(cls, v: str) -> str:
        if v not in {"en", "hi", "bn", "ta", "mr"}:
            raise ValueError("unsupported locale")
        return v


class AssistantAction(BaseModel):
    label: str
    href: str


class AssistantReply(BaseModel):
    text: str
    scheme_refs: list[str] = Field(alias="schemeRefs")
    actions: list[AssistantAction]
    detected_events: list[str] = Field(alias="detectedEvents")

    model_config = {"populate_by_name": True}


# ─── Auth ────────────────────────────────────────────────────────────────────


class AdminLoginRequest(BaseModel):
    officer_id: str = Field(min_length=1, max_length=64, alias="officerId")
    password: str = Field(min_length=1, max_length=256)

    model_config = {"populate_by_name": True}


class TokenResponse(BaseModel):
    access_token: str = Field(alias="accessToken")
    token_type: str = "bearer"
    expires_in: int = Field(alias="expiresIn")
    role: str
    name: str

    model_config = {"populate_by_name": True}
