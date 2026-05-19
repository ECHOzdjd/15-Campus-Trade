# Production secrets

Create these local files before running `docker compose -f compose.prod.yaml up -d --build`:

- `db_password.txt`
- `db_root_password.txt`
- `jwt_secret.txt`

The real `.txt` files are ignored by git.
