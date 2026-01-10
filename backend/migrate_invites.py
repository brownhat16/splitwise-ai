"""Migration script to add invites table for user invitation system."""

import sqlite3
import os

DB_FILE = "splitwise.db"

def migrate():
    if not os.path.exists(DB_FILE):
        print(f"Database {DB_FILE} not found. Table will be created by app startup.")
        return

    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Create invites table
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS invites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        inviter_id INTEGER NOT NULL,
        invitee_name VARCHAR(100) NOT NULL,
        invitee_email VARCHAR(100) NOT NULL,
        expense_id INTEGER,
        placeholder_user_id INTEGER,
        status VARCHAR(20) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (inviter_id) REFERENCES users(id),
        FOREIGN KEY (expense_id) REFERENCES expenses(id),
        FOREIGN KEY (placeholder_user_id) REFERENCES users(id)
    );
    """
    
    try:
        print("Creating invites table...")
        cursor.execute(create_table_sql)
        print("✅ Invites table created successfully.")
        
        # Create index on invitee_email for fast lookups during registration
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(invitee_email)")
        print("✅ Index on invitee_email created.")
        
    except sqlite3.OperationalError as e:
        if "already exists" in str(e):
            print("⚠️ Table already exists.")
        else:
            print(f"❌ Error: {e}")
                
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
