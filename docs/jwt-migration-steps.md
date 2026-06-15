# JWT Migration: Flask Custom Auth → Supabase Auth

Step-by-step replacements for every file that needs to change.

---

## Backend

### 1. `backend/requirements.txt`

**Remove:**
```
flask-jwt-extended
mysql-connector-python
```

**Add:**
```
psycopg2-binary
python-jose[cryptography]
requests
```

Final file should look like:
```
Flask
flask-cors
flask-bcrypt
python-dotenv
psycopg2-binary
python-jose[cryptography]
requests
```

---

### 2. `backend/auth.py`

**Delete this file entirely.** Supabase Auth handles everything it did (register, login, logout, status).

---

### 3. `backend/app.py`

**Remove these imports:**
```python
from flask_jwt_extended import JWTManager
from auth import auth_bp
```

**Remove these lines:**
```python
jwt = JWTManager(app)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES'))
app.config['JWT_TOKEN_LOCATION'] = ['cookies', 'headers']
app.config['JWT_ACCESS_COOKIE_NAME'] = 'access_token_cookie'
app.config['JWT_COOKIE_SECURE'] = False
app.config['JWT_COOKIE_SAMESITE'] = 'Lax'
app.config['JWT_ACCESS_COOKIE_PATH'] = '/'
app.config['JWT_COOKIE_CSRF_PROTECT'] = False
app.register_blueprint(auth_bp)
```

**Update CORS** to read from env var instead of hardcoded localhost:
```python
# Replace this:
CORS(app, origins=["http://localhost:3000"], supports_credentials=True)

# With this:
CORS(app, origins=[os.getenv('FRONTEND_URL', 'http://localhost:3000')], supports_credentials=True)
```

Final `app.py` should look like:
```python
from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS
from scores import score_bp
import os

load_dotenv()

app = Flask(__name__)
CORS(app, origins=[os.getenv('FRONTEND_URL', 'http://localhost:3000')], supports_credentials=True)
app.register_blueprint(score_bp)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8000)))
```

---

### 4. `backend/scores.py`

#### 4a. Replace imports and DB config

**Remove:**
```python
import mysql.connector
from dotenv import load_dotenv
import os

CONFIG = {
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'host': os.getenv('DB_HOST'),
    'port': int(os.getenv('DB_PORT')),
    'database': os.getenv('DB_NAME')
}

def get_db_connection():
    return mysql.connector.connect(**CONFIG)
```

**Replace with:**
```python
import psycopg2
import psycopg2.extras
import requests
from jose import jwt, JWTError
from dotenv import load_dotenv
import os

load_dotenv()

def get_db_connection():
    return psycopg2.connect(os.getenv('DATABASE_URL'))
```

#### 4b. Replace the JWT decorator

**Remove** all usage of `@jwt_required()` and `get_jwt_identity()`.

**Add** this helper function near the top of the file (after imports):
```python
def get_current_user_id():
    """Verify Supabase JWT and return the user's uuid, or None if invalid."""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ')[1]
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        jwks = requests.get(f"{supabase_url}/auth/v1/.well-known/jwks.json").json()
        payload = jwt.decode(token, jwks, algorithms=['RS256'], audience='authenticated')
        return payload['sub']  # user's uuid
    except JWTError:
        return None
```

#### 4c. Update each route to use the new helper

In every route that previously had `@jwt_required()` and `current_user_id = get_jwt_identity()`:

**Remove:**
```python
@jwt_required()
...
current_user_id = get_jwt_identity()
```

**Replace with:**
```python
current_user_id = get_current_user_id()
if not current_user_id:
    return jsonify({"msg": "Unauthorized"}), 401
```

Affected routes: `upload_score`, `get_scores_by_game`, `get_scores_by_user`, `get_most_played_game_by_user`, `get_scores`.

#### 4d. Update cursor usage

`psycopg2` uses `%s` placeholders (same as mysql-connector) so queries don't need to change. However, replace cursor creation to return dicts:

```python
# Replace:
cursor = conn.cursor(dictionary=True)

# With:
cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
```

For cursors that don't need dict results, plain `conn.cursor()` is fine.

#### 4e. Fix broken JSON responses

These two lines in the existing code are invalid Python and will crash:
```python
return jsonify({scores})   # in get_scores_by_game and get_scores_by_user
```

Replace with:
```python
return jsonify({"scores": scores})
```

---

### 5. `backend/.env`

**Remove:**
```
DB_USER=...
DB_PASSWORD=...
DB_HOST=...
DB_PORT=...
DB_NAME=...
JWT_SECRET_KEY=...
JWT_ACCESS_TOKEN_EXPIRES=...
```

**Add:**
```
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://[ref].supabase.co
FRONTEND_URL=http://localhost:3000
```

---

### 6. `backend/database_setup.py`

This file is no longer needed — the schema is managed directly in Supabase's SQL editor. You can delete it.

---

## Frontend

### 7. Install Supabase JS client

```bash
cd frontend
npm install @supabase/supabase-js
```

---

### 8. Create `frontend/src/lib/supabase.js` (new file)

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
```

---

### 9. Create `frontend/src/lib/api.js` (new file)

Replaces all hardcoded `http://localhost:8000` axios calls across the codebase:

```js
import axios from 'axios'
import { supabase } from './supabase'

export async function apiRequest(method, path, data) {
  const { data: { session } } = await supabase.auth.getSession()
  return axios({
    method,
    url: `${process.env.NEXT_PUBLIC_API_URL}${path}`,
    data,
    headers: {
      Authorization: `Bearer ${session?.access_token}`
    }
  })
}
```

---

### 10. `frontend/src/components/AuthContext.jsx`

**Remove:**
- All axios imports and calls to `/auth/status`
- `age` from user state
- `withCredentials: true`

**Replace `checkAuthStatus()`** with Supabase session check:
```js
import { supabase } from '@/lib/supabase'

const checkAuthStatus = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    setIsAuthenticated(false)
    setUser(null)
    return
  }
  // Fetch name from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', session.user.id)
    .single()

  setIsAuthenticated(true)
  setUser({ id: session.user.id, email: session.user.email, name: profile?.name })
}
```

**Add auth state listener** (replaces polling):
```js
useEffect(() => {
  checkAuthStatus()
  const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
    checkAuthStatus()
  })
  return () => subscription.unsubscribe()
}, [])
```

---

### 11. `frontend/src/app/login/page.jsx`

**Remove** the axios POST to `/auth/login`.

**Replace with:**
```js
import { supabase } from '@/lib/supabase'

const { error } = await supabase.auth.signInWithPassword({ email, password })
if (error) {
  setError(error.message)
  return
}
// redirect to home
```

---

### 12. `frontend/src/app/register/page.jsx`

**Remove** the axios POST to `/auth/register` and the `age` field.

**Replace with:**
```js
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase.auth.signUp({ email, password })
if (error) {
  setError(error.message)
  return
}
// Insert name into profiles table
await supabase.from('profiles').insert({ id: data.user.id, name })
// redirect to login
```

---

### 13. `frontend/src/app/Navbar.jsx`

**Remove** the axios POST to `/auth/logout`.

**Replace with:**
```js
import { supabase } from '@/lib/supabase'

await supabase.auth.signOut()
// redirect to login
```

---

### 14. Score-fetching files

Replace all hardcoded axios calls with `apiRequest` from `lib/api.js`.

**Affected files:**
- `frontend/src/app/helpers.jsx`
- `frontend/src/app/profile/page.jsx`
- `frontend/src/app/leaderboard/leaderboard.jsx`

**Pattern to replace** (in each file):
```js
// Remove:
import axios from 'axios'
...
axios.get('http://localhost:8000/scores/...', { withCredentials: true })
axios.post('http://localhost:8000/scores/...', data, { withCredentials: true })

// Replace with:
import { apiRequest } from '@/lib/api'
...
apiRequest('get', '/scores/...')
apiRequest('post', '/scores/...', data)
```

---

### 15. `frontend/.env.local` (new file)

```
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:8000
```
