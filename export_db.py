import sqlite3
import json
import os

# Path to the SQLite database
db_path = '/data/database.sqlite'
output_path = '/data/database_export.json'

def export_sqlite_to_json():
    if not os.path.exists(db_path):
        print(f"Database file not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get all table names
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()

    data = {}

    for table in tables:
        table_name = table[0]
        print(f"Exporting table: {table_name}")
        
        cursor.execute(f"SELECT * FROM {table_name};")
        rows = cursor.fetchall()
        
        # Get column names
        column_names = [description[0] for description in cursor.description]
        
        # Convert rows to list of dictionaries
        table_data = []
        for row in rows:
            table_data.append(dict(zip(column_names, row)))
            
        data[table_name] = table_data

    conn.close()

    # Save to JSON file
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Successfully exported database to {output_path}")

if __name__ == '__main__':
    export_sqlite_to_json()
