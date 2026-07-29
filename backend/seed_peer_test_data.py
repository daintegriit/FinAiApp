"""
Seed test users + profiles in a few different cities to test
the /peers/map endpoint and Globe marker rendering.

Run from the backend/ directory:
    python3 seed_peer_test_data.py

This creates:
- 3 users in New York, NY (should form a visible marker, min_cluster_size=3)
- 3 users in Austin, TX (should form a visible marker)
- 1 user in Miami, FL (should NOT show a marker — below min_cluster_size)

Safe to re-run; uses unique emails each time via a random suffix.
"""

import uuid
import random
import string
from datetime import datetime

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "postgresql+psycopg2://finai_user:finaiapp123@35.237.62.135:5432/finai_db"

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

# A dummy bcrypt-style hash is fine here since these test accounts
# are never meant to be logged into — only used for peer aggregation.
DUMMY_PASSWORD_HASH = "$2b$12$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWX"


def random_suffix(n=6):
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))


CITIES = [
    {
        "city": "New York",
        "state": "NY",
        "country": "US",
        "lat_base": 40.7128,
        "lng_base": -74.0060,
        "count": 3,
    },
    {
        "city": "Austin",
        "state": "TX",
        "country": "US",
        "lat_base": 30.2672,
        "lng_base": -97.7431,
        "count": 3,
    },
    {
        "city": "Miami",
        "state": "FL",
        "country": "US",
        "lat_base": 25.7617,
        "lng_base": -80.1918,
        "count": 1,  # below min_cluster_size=3, should NOT show a marker
    },
]


def jitter(base, spread=0.05):
    return base + random.uniform(-spread, spread)


created = []

for city_def in CITIES:
    for i in range(city_def["count"]):

        user_id = uuid.uuid4()
        suffix = random_suffix()
        email = f"testpeer_{city_def['city'].lower().replace(' ', '')}_{suffix}@example.com"
        username = f"testpeer_{suffix}"

        income = random.randint(4000, 9000)
        savings = random.randint(2000, 40000)
        debt = random.randint(0, 15000)

        session.execute(
            text("""
                INSERT INTO users (id, email, username, password_hash, is_active, is_admin, is_verified, created_at)
                VALUES (:id, :email, :username, :password_hash, true, false, true, :created_at)
            """),
            {
                "id": user_id,
                "email": email,
                "username": username,
                "password_hash": DUMMY_PASSWORD_HASH,
                "created_at": datetime.utcnow(),
            },
        )

        session.execute(
            text("""
                INSERT INTO profiles (
                    id, user_id, country, age, employment_type,
                    monthly_income, risk_tolerance, investment_experience,
                    financial_goal, lifestyle, income_stability,
                    savings_amount, debt_amount, emergency_fund_months,
                    city, state, latitude, longitude,
                    created_at, updated_at
                )
                VALUES (
                    :id, :user_id, :country, :age, :employment_type,
                    :monthly_income, :risk_tolerance, :investment_experience,
                    :financial_goal, :lifestyle, :income_stability,
                    :savings_amount, :debt_amount, :emergency_fund_months,
                    :city, :state, :latitude, :longitude,
                    :created_at, :updated_at
                )
            """),
            {
                "id": uuid.uuid4(),
                "user_id": user_id,
                "country": city_def["country"],
                "age": random.randint(24, 45),
                "employment_type": "full_time",
                "monthly_income": income,
                "risk_tolerance": "moderate",
                "investment_experience": "beginner",
                "financial_goal": "save_for_emergency",
                "lifestyle": "balanced",
                "income_stability": "stable",
                "savings_amount": savings,
                "debt_amount": debt,
                "emergency_fund_months": random.randint(1, 6),
                "city": city_def["city"],
                "state": city_def["state"],
                "latitude": round(jitter(city_def["lat_base"]), 6),
                "longitude": round(jitter(city_def["lng_base"]), 6),
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            },
        )

        created.append((email, city_def["city"], city_def["state"]))

session.commit()
session.close()

print(f"✅ Created {len(created)} test users with profiles:")
for email, city, state in created:
    print(f"   - {email} → {city}, {state}")

print("\nRun this to verify the map endpoint sees the clusters:")
print('curl -s "https://finai-backend-466323878357.us-east1.run.app/api/peers/map?user_id=656054ba-9bd2-4787-a122-f148266e91ee"')