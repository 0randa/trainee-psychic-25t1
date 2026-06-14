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
