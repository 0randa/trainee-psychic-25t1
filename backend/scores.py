import logging

from flask import Blueprint, jsonify, request

import psycopg2
import psycopg2.extras
import requests
from jose import jwt, JWTError
from dotenv import load_dotenv
import os

load_dotenv()

logging.basicConfig(level=logging.INFO,filename='log.log', filemode='w')

score_bp = Blueprint('score', __name__)


# Black magic which connects to database
def get_db_connection():
    return psycopg2.connect(os.getenv('DATABASE_URL'))


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


@score_bp.route('/scores/upload', methods=['POST'])
def upload_score():
    """
    Upload the game score
    ---
    Uploads the score for the given game_id, using the Supabase JWT

    Request body (JSON):
    -   score (int): The score of the game
    - game_id (int): The game_id of the score

    Response:
    - 201 Created: Score uploaded successfully
    - 400 Bad Request: Missing game_id or score
    - 401 Unauthorized: Invalid credentials
    - 404 Not Found: No game_id found with the given game_id
    - 500 Internal Server Error: Database or server error
    """
    current_user_id = get_current_user_id()
    if not current_user_id:
        return jsonify({"msg": "Unauthorized"}), 401

    data = request.get_json()

    if not data or 'game_id' not in data or 'score' not in data:
        return jsonify({"msg": "Missing game_id or score in request body."}), 400

    game_id = data['game_id']
    score = data['score']

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if the game exists
        cursor.execute('select id from "Games" where id = %s', (game_id,))
        game = cursor.fetchone()
        if not game:
            return jsonify({"msg": "Game not found."}), 404

        # Insert score into Scores table
        cursor.execute(
            'insert into "Scores" (user_id, game_id, score) values (%s, %s, %s)',
            (current_user_id, game_id, score)
        )
        conn.commit()

        return jsonify({"msg": "Score uploaded successfully."}), 201
    except Exception as e:
        print(f"Exception during score upload: {e}")
        return jsonify({"msg": "Internal server error."}), 500
    finally:
        cursor.close()
        conn.close()

@score_bp.route('/scores/game', methods=['GET'])
def get_scores_by_game():
    current_user_id = get_current_user_id()
    if not current_user_id:
        return jsonify({"msg": "Unauthorized"}), 401

    data = request.get_json()

    game_id = data['game_id']

    # pull the scores from the database
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # check if game exists
        get_game_query = 'select * from "Games" where id = %s'
        cursor.execute(get_game_query, (game_id, ))

        game = cursor.fetchone()
        if not game:
            return jsonify({"msg": "Game not found."}), 404

        # get all the scores.
        get_scores_query = 'select * from "Scores" where game_id = %s'
        cursor.execute(get_scores_query, (game_id,))

        scores = cursor.fetchall()

        conn.commit()
        return jsonify({"scores": scores})

    except Exception as e:
        print(f"Error {e}")
        return jsonify({"msg": "Interal server error"}), 500
    finally:
        cursor.close()
        conn.close()

@score_bp.route('/scores/user', methods=['GET'])
def get_scores_by_user():
    current_user_id = get_current_user_id()
    if not current_user_id:
        return jsonify({"msg": "Unauthorized"}), 401

    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # fetch all of the scores related to the user
        query = 'select SUM(score) from "Scores" where user_id = %s'
        cursor.execute(query, (current_user_id, ))
        scores = cursor.fetchone()[0] or 0
        conn.commit()
        return jsonify({"scores": scores})

    except Exception as e:
        print(f"Error {e}")
        return jsonify({"msg": "Error"}), 500
    finally:
        cursor.close()
        conn.close()


@score_bp.route('/scores/user/most_played', methods=['GET'])
def get_most_played_game_by_user():
    current_user_id = get_current_user_id()
    if not current_user_id:
        return jsonify({"msg": "Unauthorized"}), 401

    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        query = """
        select
            s.game_id,
            sum(s.score) AS total_score_for_most_played_game
        from "Scores" AS s
        join "Games" AS G on s.game_id = G.id
        where s.user_id = %s
        group by s.game_id, G.name
        having count(s.game_id) = (
            select max(play_count)
            from (
                select game_id, COUNT(*) AS play_count
                from "Scores"
                where user_id = %s
                group by game_id
            ) as UserMaxPlayCounts
        )
        order by count(s.game_id) desc
        limit 1;
        """

        cursor.execute(query, (current_user_id, current_user_id))
        most_played_game = cursor.fetchone()

        if most_played_game:
            response_data = {"game_id": most_played_game[0], "score": most_played_game[1]}
            return jsonify(response_data)
        else:
            return jsonify({"msg": "No most played game found for this user."}), 404

    except Exception as e:
        print(f"Error: {e}")
        # Log the full traceback in a real application for debugging
        return jsonify({"msg": "Internal server error"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@score_bp.route('/scores/get', methods=['GET'])
def get_scores():
    current_user_id = get_current_user_id()
    if not current_user_id:
        return jsonify({"msg": "Unauthorized"}), 401

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        query = """select s.user_id, u.name, sum(score) from "Scores" s
        join profiles u on
        u.id = s.user_id
        group by s.user_id, u.name"""

        cur.execute(query)

        res = cur.fetchall()
        conn.commit()

        scores_list = [{"username": row[1], "score": row[2]} for row in res]
        return jsonify({"scores": scores_list})
    except Exception as e:
        print(f"Error {e}")
        return jsonify({"msg": str(e)}), 500
    finally:
        cur.close()
        conn.close()
