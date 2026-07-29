
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_active_user, require_ownership
from app.db.session import get_db
from app.models.categories import Category
from app.models.transactions import Transaction
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"],
    redirect_slashes=False,
)


# --------------------------------------------------
# Schema
# --------------------------------------------------
# Was Dict[str, Any] with hand-rolled validation. A typed model gives
# consistent 422s, blocks oversized strings, and removes the path where
# user_id arrived from the client.

class TransactionCreate(BaseModel):
    amount: float = Field(..., gt=0, le=10_000_000)
    category: str = Field(..., min_length=1, max_length=64)
    merchant: Optional[str] = Field(default=None, max_length=120)
    note: Optional[str] = Field(default=None, max_length=500)
    is_recurring: bool = False
    recurring_term_months: Optional[float] = Field(
        default=None, gt=0, le=600
    )


def serialize_transaction(tx: Transaction) -> Dict[str, Any]:
    return {
        "id": tx.id,
        "user_id": str(tx.user_id) if tx.user_id else None,
        "category": tx.category,
        "merchant": tx.merchant,
        "note": tx.note,
        "amount": float(tx.amount),
        "is_recurring": bool(tx.is_recurring),
        "recurring_term_months": (
            float(tx.recurring_term_months)
            if tx.recurring_term_months is not None
            else None
        ),
        "created_at": tx.created_at.isoformat() if tx.created_at else None,
    }


# --------------------------------------------------
# GET /transactions
# --------------------------------------------------
# Was GET /transactions?user_id=<uuid>, which returned any user's full
# spending history.

@router.get("", response_model=List[dict])
def get_transactions(
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        transactions = (
            db.query(Transaction)
            .filter(Transaction.user_id == current_user.id)
            .order_by(Transaction.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

        return [serialize_transaction(tx) for tx in transactions]

    except Exception:
        logger.exception("Failed to fetch transactions for %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch transactions",
        )


# --------------------------------------------------
# POST /transactions
# --------------------------------------------------

@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        # A one-time purchase never carries a term, so downstream
        # engines never see a stray value for a non-recurring row.
        recurring_term_months = (
            data.recurring_term_months if data.is_recurring else None
        )

        if data.is_recurring and recurring_term_months is None:
            raise ValueError(
                "recurring_term_months is required when is_recurring is true"
            )

        category_name = data.category.strip()

        transaction = Transaction(
            user_id=current_user.id,
            category=category_name,
            merchant=data.merchant.strip() if data.merchant else None,
            note=data.note.strip() if data.note else None,
            amount=data.amount,
            is_recurring=data.is_recurring,
            recurring_term_months=recurring_term_months,
        )

        db.add(transaction)
        db.flush()

        # Category spend rollup, scoped to the owner.
        category_record = (
            db.query(Category)
            .filter(
                func.lower(Category.name) == category_name.lower(),
                Category.user_id == current_user.id,
            )
            .first()
        )

        if category_record:
            category_record.spent = (
                float(category_record.spent or 0) + data.amount
            )

        db.commit()
        db.refresh(transaction)

        logger.info(
            "Transaction created",
            extra={
                "transaction_id": transaction.id,
                "user_id": str(current_user.id),
            },
        )

        return serialize_transaction(transaction)

    except ValueError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception:
        db.rollback()
        logger.exception("Transaction creation failed for %s", current_user.id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create transaction",
        )


# --------------------------------------------------
# DELETE /transactions/{transaction_id}
# --------------------------------------------------
# Was scoped by a client-supplied user_id query param: pass someone
# else's ID and delete their records.

@router.delete("/{transaction_id}", response_model=dict)
def delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        transaction = (
            db.query(Transaction)
            .filter(Transaction.id == transaction_id)
            .first()
        )

        if not transaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Transaction not found",
            )

        # LAYER 3 — authenticated is not authorised.
        require_ownership(transaction.user_id, current_user)

        category_record = (
            db.query(Category)
            .filter(
                func.lower(Category.name)
                == (transaction.category or "").strip().lower(),
                Category.user_id == current_user.id,
            )
            .first()
        )

        if category_record:
            category_record.spent = max(
                0.0,
                float(category_record.spent or 0)
                - float(transaction.amount or 0),
            )

        db.delete(transaction)
        db.commit()

        logger.info("Transaction deleted: %s", transaction_id)

        return {"success": True, "deleted_id": transaction_id}

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        logger.exception("Transaction deletion failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete transaction",
        )