
import getpass
import re

from auth.auth_database import (
    initialize_database,
    find_user_by_email,
    create_user,
)
from auth.security import hash_password


def main():
    initialize_database()

    print("\n===== ProofMesh Admin Setup =====")

    username = input("Admin username: ").strip()
    email = input("Admin email: ").strip().lower()

    if not username or len(username) < 3:
        print("Username must contain at least 3 characters.")
        return

    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        print("Enter a valid email address.")
        return

    if find_user_by_email(email):
        print("An account with this email already exists.")
        return

    password = getpass.getpass("Admin password: ")
    confirm = getpass.getpass("Confirm password: ")

    if password != confirm:
        print("Passwords do not match.")
        return

    if len(password) < 12 or len(password) > 128:
        print("Admin password must contain between 12 and 128 characters.")
        return

    password_hash = hash_password(password)

    user_id = create_user(
        username=username,
        email=email,
        password_hash=password_hash,
        role="admin"
    )

    print("\nAdmin account created successfully.")
    print(f"Admin user ID: {user_id}")
    print(f"Admin email: {email}")


if __name__ == "__main__":
    main()
