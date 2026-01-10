"""Database configuration with async SQLAlchemy. Supports SQLite and PostgreSQL."""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
import os
import ssl
import re

# Database URL - supports both SQLite (local) and PostgreSQL (Neon)
raw_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./splitwise.db")

# Debug: Print masked URL to logs
def mask_password(url):
    return re.sub(r':([^@]+)@', ':***@', url)
print(f"[DB] Raw DATABASE_URL: {mask_password(raw_url)}")

# Handle Neon/PostgreSQL URLs (convert to async driver)
if raw_url.startswith("postgres://"):
    DATABASE_URL = raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif raw_url.startswith("postgresql://"):
    DATABASE_URL = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    DATABASE_URL = raw_url

# Remove sslmode from URL (asyncpg uses 'ssl' parameter instead)
# We'll pass ssl context via connect_args
if "sslmode=require" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("?sslmode=require", "").replace("&sslmode=require", "")

# Create async engine with appropriate settings
engine_kwargs = {
    "echo": os.getenv("DEBUG", "false").lower() == "true",
    "future": True
}

# PostgreSQL specific settings
if "asyncpg" in DATABASE_URL:
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
    # asyncpg requires ssl context, not sslmode string
    engine_kwargs["connect_args"] = {"ssl": "require"}

engine = create_async_engine(DATABASE_URL, **engine_kwargs)

# Create async session factory
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    """Base class for all models."""
    pass


async def init_db():
    """Initialize the database, creating all tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    """Dependency to get database session."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

