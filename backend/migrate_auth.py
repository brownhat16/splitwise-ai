
import sqlite3
import os

DB_FILE = "splitwise.db"

def migrate():
    if not os.path.exists(DB_FILE):
        print(f"Database {DB_FILE} not found. Skipping migration (will be created by app).")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    columns = [
        ("hashed_password", "VARCHAR(255)"),
        ("role", "VARCHAR(20) DEFAULT 'user'"),
        ("is_active", "BOOLEAN DEFAULT 1")
    ]
    
    for col_name, col_type in columns:
        try:
            print(f"Adding column {col_name}...")
            cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
            print(f"✅ Added {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e):
                print(f"⚠️ Column {col_name} already exists.")
            else:
                print(f"❌ Error adding {col_name}: {e}")
                
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
