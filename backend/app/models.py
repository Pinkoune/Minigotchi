from sqlalchemy import JSON, BigInteger, Integer, MetaData, String, Table, Column

metadata = MetaData()

# One row per user. `rev` increases by 1 on every accepted write and drives
# the optimistic-concurrency check in PUT /api/save.
saves = Table(
    "saves",
    metadata,
    Column("user_id", String(191), primary_key=True),
    Column("save_json", JSON, nullable=False),
    Column("rev", Integer, nullable=False, default=1),
    Column("updated_at", BigInteger, nullable=False),  # unix ms
)
