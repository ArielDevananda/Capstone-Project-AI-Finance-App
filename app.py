import os
import re
from functools import wraps
from flask import Flask, request, jsonify, session, Response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import extract, func
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
from dotenv import load_dotenv
from openai import OpenAI
# --- LOAD ENVIRONMENT VARIABLES ---
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'fallback-dev-key-change-in-production')
app.config.update(
    SESSION_COOKIE_SECURE=os.getenv('FLASK_ENV') == 'production',
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
)

cors_origins = [
    origin.strip()
    for origin in os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    if origin.strip()
]
CORS(app, supports_credentials=True, origins=cors_origins)

# --- DATABASE CONFIGURATION ---
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'postgresql://postgres:password@localhost/wealthvision_db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'pool_timeout': 30,
    'pool_recycle': 1800,
    'max_overflow': 20,
}

db = SQLAlchemy(app)


# ========================================================================
# DECORATOR: LOGIN REQUIRED
# ========================================================================
def login_required(f):
    """
    Decorator to protect API endpoints, ensuring only authenticated users can access them.
    It intercepts requests and verifies the presence of 'user_id' in the active session.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({
                "status": "error",
                "message": "Akses ditolak! Silakan login terlebih dahulu."
            }), 401
        return f(*args, **kwargs)
    return decorated


# ========================================================================
# DATABASE MODELS
# ========================================================================

class User(db.Model):
    """
    User entity model representing application users.
    Stores authentication credentials and personal details, and maintains relationships
    with all associated user data (transactions, budgets, savings, preferences).
    """
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    nama = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    
    # Relationships mapped to user-specific data entities
    transaksi = db.relationship('Transaksi', backref='user', lazy=True, cascade='all, delete-orphan')
    anggaran = db.relationship('Anggaran', backref='user', lazy=True, cascade='all, delete-orphan')
    savings_goals = db.relationship('SavingsGoal', backref='user', lazy=True, cascade='all, delete-orphan')
    preferences = db.relationship('UserPreference', backref='user', lazy=True, uselist=False, cascade='all, delete-orphan')
    notifications = db.relationship('NotificationLog', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Generates and sets a secure password hash using Werkzeug before saving to the database."""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Verifies the provided plaintext password against the stored password hash."""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Serializes user data to a dictionary, explicitly excluding sensitive fields like password_hash."""
        return {
            "id": self.id,
            "email": self.email,
            "nama": self.nama,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }


class Transaksi(db.Model):
    """
    Transaction entity model representing a single income or expense record.
    Each record is strictly associated with a specific user.
    """
    __tablename__ = 'transaksi'
    __table_args__ = (
        db.Index('idx_transaksi_user_tanggal', 'user_id', 'tanggal'),
        db.Index('idx_transaksi_user_jenis', 'user_id', 'jenis'),
    )
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    jenis = db.Column(db.String(20), nullable=False)  # Type: "pemasukan" (income) or "pengeluaran" (expense)
    nominal = db.Column(db.Integer, nullable=False)
    kategori = db.Column(db.String(50), nullable=False)
    deskripsi = db.Column(db.String(200), default='')
    tanggal = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "jenis": self.jenis,
            "nominal": self.nominal,
            "kategori": self.kategori,
            "deskripsi": self.deskripsi or '',
            "tanggal": self.tanggal.strftime("%Y-%m-%d %H:%M:%S")
        }


class NotificationLog(db.Model):
    """
    System notification log model. 
    Provides persistence for user alerts (e.g., budget limits exceeded) so they can be tracked as read/unread.
    """
    __tablename__ = 'notification_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    tipe = db.Column(db.String(50), nullable=False)
    judul = db.Column(db.String(120), nullable=False)
    pesan = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default='unread')
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "tipe": self.tipe,
            "judul": self.judul,
            "pesan": self.pesan,
            "status": self.status,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None
        }


class Anggaran(db.Model):
    """
    Budget entity model representing a user's spending limit for a specific category within a given month and year.
    """
    __tablename__ = 'anggaran'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    kategori = db.Column(db.String(50), nullable=False)
    batas = db.Column(db.Integer, nullable=False)
    bulan = db.Column(db.Integer, nullable=False)
    tahun = db.Column(db.Integer, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "kategori": self.kategori,
            "batas": self.batas,
            "bulan": self.bulan,
            "tahun": self.tahun
        }


class SavingsGoal(db.Model):
    """
    Savings Goal entity model.
    Tracks user-defined financial objectives, including the target amount and progress.
    """
    __tablename__ = 'savings_goals'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    nama_goal = db.Column(db.String(120), nullable=False)
    target_amount = db.Column(db.Integer, nullable=False)
    current_savings = db.Column(db.Integer, nullable=False, default=0)
    monthly_income = db.Column(db.Integer, nullable=False, default=0)
    monthly_expenses = db.Column(db.Integer, nullable=False, default=0)
    deadline = db.Column(db.String(7), nullable=False)  # YYYY-MM
    ai_plan = db.Column(db.Text, default='')
    status = db.Column(db.String(20), nullable=False, default='active')
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "namaGoal": self.nama_goal,
            "targetAmount": self.target_amount,
            "currentSavings": self.current_savings,
            "monthlyIncome": self.monthly_income,
            "monthlyExpenses": self.monthly_expenses,
            "deadline": self.deadline,
            "aiPlan": self.ai_plan or '',
            "status": self.status,
            "created_at": self.created_at.strftime("%Y-%m-%d %H:%M:%S") if self.created_at else None,
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S") if self.updated_at else None
        }


class UserPreference(db.Model):
    """
    User Preferences entity model.
    Stores application-wide settings for a user, such as preferred currency and language.
    """
    __tablename__ = 'user_preferences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    currency = db.Column(db.String(10), nullable=False, default='USD')
    language = db.Column(db.String(10), nullable=False, default='en')
    notif_email = db.Column(db.Boolean, nullable=False, default=True)
    notif_budget = db.Column(db.Boolean, nullable=False, default=True)
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    def to_dict(self):
        return {
            "currency": self.currency,
            "language": self.language,
            "notif_email": self.notif_email,
            "notif_budget": self.notif_budget,
            "updated_at": self.updated_at.strftime("%Y-%m-%d %H:%M:%S") if self.updated_at else None
        }


def get_or_create_preferences(user_id):
    """Retrieves existing user preferences from the database, or initializes and saves default preferences if none exist."""
    preferences = UserPreference.query.filter_by(user_id=user_id).first()
    if not preferences:
        preferences = UserPreference(user_id=user_id)
        db.session.add(preferences)
        db.session.commit()
    return preferences


def parse_date_yyyy_mm_dd(date_value):
    """Validates and parses a string into a datetime object using the YYYY-MM-DD format."""
    try:
        return datetime.strptime(date_value, "%Y-%m-%d")
    except (ValueError, TypeError):
        return None


def is_valid_yyyy_mm(value):
    """Validates that a given string matches the strict YYYY-MM month format using regular expressions."""
    if not isinstance(value, str) or not re.match(r'^\d{4}-(0[1-9]|1[0-2])$', value):
        return False
    return True


def build_budget_alerts(user_id, bulan=None, tahun=None, persist=False):
    """
    Generates active budget alerts by comparing the user's current monthly expenses 
    against their predefined category limits. Calculates percentages and triggers 
    warnings (80%) or danger alerts (100%).
    """
    now = datetime.now()
    bulan = int(bulan or now.month)
    tahun = int(tahun or now.year)

    preferences = get_or_create_preferences(user_id)
    if not preferences.notif_budget:
        return []

    budgets = Anggaran.query.filter_by(user_id=user_id, bulan=bulan, tahun=tahun).all()
    alerts = []

    if not budgets:
        return []

    # Get all expenses for this user, month, year grouped by category
    pengeluaran_per_kategori = db.session.query(
        Transaksi.kategori, func.sum(Transaksi.nominal)
    ).filter(
        Transaksi.user_id == user_id,
        Transaksi.jenis == 'pengeluaran',
        extract('month', Transaksi.tanggal) == bulan,
        extract('year', Transaksi.tanggal) == tahun
    ).group_by(Transaksi.kategori).all()
    
    # Convert to dict for fast lookup
    used_dict = {kategori: int(total) for kategori, total in pengeluaran_per_kategori}

    for budget in budgets:
        used = used_dict.get(budget.kategori, 0)

        if budget.batas <= 0:
            continue

        # Currency formatting
        curr_symbol = "$" if preferences.currency == "USD" else "Rp"
        formatted_used = f"{curr_symbol}{used:,.2f}" if preferences.currency == "USD" else f"Rp {used:,}"
        formatted_limit = f"{curr_symbol}{budget.batas:,.2f}" if preferences.currency == "USD" else f"Rp {budget.batas:,}"

        percentage = round((used / budget.batas) * 100, 2)
        if percentage >= 100:
            severity = "danger"
            if preferences.language == "en":
                title = f"{budget.kategori.capitalize()} Budget Exceeded"
                message = f"{budget.kategori.capitalize()} expenses have reached {formatted_used} of {formatted_limit} limit ({percentage:.0f}%)."
            else:
                title = f"Anggaran {budget.kategori} terlampaui"
                message = f"Pengeluaran kategori {budget.kategori} sudah {formatted_used} dari batas {formatted_limit} ({percentage:.0f}%)."
        elif percentage >= 80:
            severity = "warning"
            if preferences.language == "en":
                title = f"{budget.kategori.capitalize()} Budget Nearing Limit"
                message = f"{budget.kategori.capitalize()} expenses are at {formatted_used} of {formatted_limit} limit ({percentage:.0f}%)."
            else:
                title = f"Anggaran {budget.kategori} mendekati batas"
                message = f"Pengeluaran kategori {budget.kategori} sudah {formatted_used} dari batas {formatted_limit} ({percentage:.0f}%)."
        else:
            continue

        alert = {
            "kategori": budget.kategori,
            "used": int(used),
            "limit": int(budget.batas),
            "percentage": percentage,
            "severity": severity,
            "title": title,
            "message": message,
            "bulan": bulan,
            "tahun": tahun
        }
        alerts.append(alert)

        if persist:
            exists = NotificationLog.query.filter_by(
                user_id=user_id,
                tipe='budget_alert',
                judul=title
            ).filter(NotificationLog.pesan == message).first()
            if not exists:
                db.session.add(NotificationLog(
                    user_id=user_id,
                    tipe='budget_alert',
                    judul=title,
                    pesan=message
                ))

    if persist and alerts:
        db.session.commit()

    return alerts


# --- DATABASE INITIALIZATION ---
with app.app_context():
    db.create_all()


# ========================================================================
# ROUTES — HEALTH CHECK
# ========================================================================
@app.route('/')
def home():
    return jsonify({"status": "success", "message": "Markas Backend Flask Beroperasi Normal!"})


# ========================================================================
# AUTHENTICATION ENDPOINTS
# ========================================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """
    API endpoint for registering a new user.
    Validates email format and password strength. If successful, hashes the password
    and stores the new user record in the PostgreSQL database.
    """
    data = request.get_json()
    
    # Validasi input
    if not data.get('email') or not data.get('password') or not data.get('nama'):
        return jsonify({
            "status": "error",
            "message": "Email, password, dan nama wajib diisi!"
        }), 400

    # Validasi format email
    email = data['email'].strip()
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return jsonify({
            "status": "error",
            "message": "Format email tidak valid!"
        }), 400

    # Validasi panjang password minimal 6 karakter
    if len(data['password']) < 6:
        return jsonify({
            "status": "error",
            "message": "Password minimal 6 karakter!"
        }), 400
    
    # Cek apakah email sudah terdaftar
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({
            "status": "error",
            "message": "Email sudah terdaftar!"
        }), 409
    
    try:
        new_user = User(
            email=email,
            nama=data['nama'].strip()
        )
        new_user.set_password(data['password'])
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            "status": "success",
            "message": "Akun berhasil dibuat! Silakan login.",
            "user": new_user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": f"Gagal membuat akun: {str(e)}"
        }), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    """
    API endpoint for user authentication (Login).
    Verifies the provided email and plaintext password against the stored hash.
    If valid, establishes a secure HTTP-only session for the user.
    """
    data = request.get_json()
    
    if not data.get('email') or not data.get('password'):
        return jsonify({
            "status": "error",
            "message": "Email dan password wajib diisi!"
        }), 400
    
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({
            "status": "error",
            "message": "Email atau password salah!"
        }), 401
    
    # Set session
    session['user_id'] = user.id
    session['user_email'] = user.email
    
    return jsonify({
        "status": "success",
        "message": "Login berhasil!",
        "user": user.to_dict()
    }), 200


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """
    API endpoint to terminate a user's session securely.
    Clears all active session cookies.
    """
    session.clear()
    return jsonify({
        "status": "success",
        "message": "Logout berhasil!"
    }), 200


@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    """
    Simplified password reset endpoint for Capstone/Demo purposes.
    In a production environment, this should ideally utilize a one-time email token 
    mechanism for security validation.
    """
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password_baru = data.get('password_baru', '')

    if not email or not password_baru:
        return jsonify({"status": "error", "message": "Email dan password baru wajib diisi!"}), 400

    if len(password_baru) < 6:
        return jsonify({"status": "error", "message": "Password baru minimal 6 karakter!"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"status": "error", "message": "Email tidak ditemukan!"}), 404

    try:
        user.set_password(password_baru)
        db.session.commit()
        return jsonify({"status": "success", "message": "Password berhasil direset. Silakan login dengan password baru."}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Gagal reset password: {str(e)}"}), 500


@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    """
    API endpoint to retrieve the currently authenticated user's profile.
    Validates session context and fetches user data excluding sensitive information.
    """
    if 'user_id' not in session:
        return jsonify({
            "status": "error",
            "message": "Tidak ada user yang login"
        }), 401
    
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({
            "status": "error",
            "message": "User tidak ditemukan"
        }), 404
    
    return jsonify({
        "status": "success",
        "user": user.to_dict()
    }), 200


@app.route('/api/auth/profile', methods=['PUT'])
@login_required
def update_profile():
    """
    API endpoint to update the authenticated user's profile (name and/email).
    Ensures the new email does not collide with existing registered users.
    """
    data = request.get_json()
    user = User.query.get(session['user_id'])

    if not user:
        return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404

    nama_baru = data.get('nama', '').strip()
    email_baru = data.get('email', '').strip()

    if not nama_baru or not email_baru:
        return jsonify({"status": "error", "message": "Nama dan email wajib diisi!"}), 400

    # Cek apakah email baru sudah dipakai user lain
    if email_baru != user.email:
        existing = User.query.filter_by(email=email_baru).first()
        if existing:
            return jsonify({"status": "error", "message": "Email sudah digunakan akun lain!"}), 409

    user.nama = nama_baru
    user.email = email_baru
    session['user_email'] = email_baru  # Sinkronkan session

    try:
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Profil berhasil diperbarui!",
            "user": user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Gagal memperbarui profil: {str(e)}"}), 500


@app.route('/api/auth/password', methods=['PUT'])
@login_required
def update_password():
    """
    API endpoint to change the authenticated user's password.
    Requires validation of the current password before applying the new hashed password.
    """
    data = request.get_json()
    user = User.query.get(session['user_id'])

    if not user:
        return jsonify({"status": "error", "message": "User tidak ditemukan"}), 404

    password_lama = data.get('password_lama', '')
    password_baru = data.get('password_baru', '')

    if not password_lama or not password_baru:
        return jsonify({"status": "error", "message": "Password lama dan baru wajib diisi!"}), 400

    if not user.check_password(password_lama):
        return jsonify({"status": "error", "message": "Password lama tidak sesuai!"}), 401

    if len(password_baru) < 6:
        return jsonify({"status": "error", "message": "Password baru minimal 6 karakter!"}), 400

    user.set_password(password_baru)
    try:
        db.session.commit()
        return jsonify({"status": "success", "message": "Password berhasil diubah!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Gagal mengubah password: {str(e)}"}), 500


# ========================================================================
# TRANSAKSI ENDPOINTS (PROTECTED — user_id scoped)
# ========================================================================

@app.route('/api/transaksi', methods=['GET'])
@login_required
def get_transaksi():
    """
    API endpoint to fetch all transactions belonging to the authenticated user.
    Supports optional filtering by month and year, and provides paginated results.
    """
    bulan = request.args.get('bulan')
    tahun = request.args.get('tahun')
    page = request.args.get('page', type=int)
    limit = request.args.get('limit', type=int)
    
    # SCOPED: Hanya data milik user ini
    query = Transaksi.query.filter_by(user_id=session['user_id'])
    
    if bulan and tahun:
        query = query.filter(
            extract('month', Transaksi.tanggal) == bulan,
            extract('year', Transaksi.tanggal) == tahun
        )
    
    query = query.order_by(Transaksi.tanggal.desc())
    
    # Apply pagination if provided
    if page and limit:
        pagination = query.paginate(page=page, per_page=limit, error_out=False)
        semua_transaksi = pagination.items
        total_data = pagination.total
        total_pages = pagination.pages
    else:
        # Fallback if no pagination (can optionally add a hard limit here)
        semua_transaksi = query.all()
        total_data = len(semua_transaksi)
        total_pages = 1
        
    data_list = [transaksi.to_dict() for transaksi in semua_transaksi]
    
    return jsonify({
        "status": "success",
        "total_data": total_data,
        "total_pages": total_pages,
        "current_page": page or 1,
        "data": data_list
    }), 200


@app.route('/api/transaksi/tren', methods=['GET'])
@login_required
def get_transaksi_tren():
    """
    API endpoint to fetch transaction trends (income and expenses) over the past N months.
    Aggregates total nominal values grouped by month and transaction type for chart visualization.
    """
    months_back = request.args.get('months', 6, type=int)
    
    now = datetime.now()
    
    # Generate list of past N months
    past_months = []
    for i in range(months_back - 1, -1, -1):
        # Calculate month and year properly
        d_month = now.month - i
        d_year = now.year
        while d_month <= 0:
            d_month += 12
            d_year -= 1
        past_months.append((d_year, d_month))
        
    # Start date is the 1st of the oldest month
    start_date = datetime(past_months[0][0], past_months[0][1], 1)
    
    # Query database to group by year, month, and jenis
    agregasi = db.session.query(
        extract('year', Transaksi.tanggal).label('tahun'),
        extract('month', Transaksi.tanggal).label('bulan'),
        Transaksi.jenis,
        func.sum(Transaksi.nominal).label('total')
    ).filter(
        Transaksi.user_id == session['user_id'],
        Transaksi.tanggal >= start_date
    ).group_by(
        extract('year', Transaksi.tanggal),
        extract('month', Transaksi.tanggal),
        Transaksi.jenis
    ).all()
    
    # Convert query result to dict for easy lookup
    agg_dict = {}
    for t_tahun, t_bulan, t_jenis, t_total in agregasi:
        key = f"{int(t_tahun)}-{int(t_bulan)}"
        if key not in agg_dict:
            agg_dict[key] = {"pemasukan": 0, "pengeluaran": 0}
        agg_dict[key][t_jenis] = int(t_total)
        
    # Build final array sorted chronologically
    data_list = []
    for p_year, p_month in past_months:
        key = f"{p_year}-{p_month}"
        data_list.append({
            "tahun": p_year,
            "bulan": p_month,
            "pemasukan": agg_dict.get(key, {}).get("pemasukan", 0),
            "pengeluaran": agg_dict.get(key, {}).get("pengeluaran", 0)
        })
        
    return jsonify({
        "status": "success",
        "data": data_list
    }), 200


@app.route('/api/tambah', methods=['POST'])
@login_required
def tambah_transaksi():
    """
    API endpoint to create a new transaction record for the authenticated user.
    Validates transaction type, positive nominal value, category whitelisting, and date formatting.
    """
    data = request.get_json()
    
    # Validasi input
    if not data.get('jenis') or not data.get('nominal') or not data.get('kategori'):
        return jsonify({
            "status": "error",
            "message": "Jenis, nominal, dan kategori wajib diisi!"
        }), 400

    # Validasi jenis transaksi
    if data['jenis'] not in ('pemasukan', 'pengeluaran'):
        return jsonify({
            "status": "error",
            "message": "Jenis harus 'pemasukan' atau 'pengeluaran'!"
        }), 400

    # Validasi nominal > 0
    try:
        nominal_val = int(data['nominal'])
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Nominal harus berupa angka!"}), 400
    if nominal_val <= 0:
        return jsonify({"status": "error", "message": "Nominal harus lebih dari 0!"}), 400
    kategori_valid = ['makanan', 'transportasi', 'hiburan', 'tagihan', 'tempat_tinggal', 'pendidikan', 'kesehatan', 'belanja', 'lainnya', 'gaji', 'bonus', 'investasi', 'cicilan', 'tabungan', 'keluarga', 'zakat_donasi', 'asuransi', 'pemberian', 'penjualan']
    if data['kategori'] not in kategori_valid:
        return jsonify({"status": "error", "message": "Kategori tidak valid!"}), 400

    try:
        baru = Transaksi(
            user_id=session['user_id'],
            jenis=data.get('jenis'),
            nominal=nominal_val,
            kategori=data.get('kategori'),
            deskripsi=data.get('deskripsi', '')
        )
        if 'tanggal' in data and data['tanggal']:
            tanggal = parse_date_yyyy_mm_dd(data['tanggal'])
            if not tanggal:
                return jsonify({"status": "error", "message": "Format tanggal harus YYYY-MM-DD!"}), 400
            baru.tanggal = tanggal

        db.session.add(baru)
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Data berhasil disimpan!",
            "data": baru.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "status": "error",
            "message": f"Gagal menyimpan data: {str(e)}"
        }), 500


@app.route('/api/transaksi/<int:id>', methods=['DELETE'])
@login_required
def hapus_transaksi(id):
    """
    API endpoint to delete a specific transaction.
    Enforces strict scoped authorization ensuring the transaction belongs to the session user.
    """
    transaksi = Transaksi.query.filter_by(id=id, user_id=session['user_id']).first()
    if not transaksi:
        return jsonify({"status": "error", "message": "Data tidak ditemukan!"}), 404
    
    try:
        db.session.delete(transaksi)
        db.session.commit()
        return jsonify({"status": "success", "message": "Transaksi berhasil dihapus!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Gagal menghapus transaksi: {str(e)}"}), 500


@app.route('/api/transaksi/<int:id>', methods=['PUT'])
@login_required
def update_transaksi(id):
    """
    API endpoint to update an existing transaction.
    Validates input and ensures scoped authorization before committing changes.
    """
    transaksi = Transaksi.query.filter_by(id=id, user_id=session['user_id']).first()
    if not transaksi:
        return jsonify({"status": "error", "message": "Data tidak ditemukan!"}), 404
        
    data = request.get_json()

    # Validasi jenis jika diberikan
    if 'jenis' in data and data['jenis'] not in ('pemasukan', 'pengeluaran'):
        return jsonify({"status": "error", "message": "Jenis harus 'pemasukan' atau 'pengeluaran'!"}), 400

    # Validasi nominal jika diberikan
    if 'nominal' in data:
        try:
            nominal_val = int(data['nominal'])
        except (ValueError, TypeError):
            return jsonify({"status": "error", "message": "Nominal harus berupa angka!"}), 400
        if nominal_val <= 0:
            return jsonify({"status": "error", "message": "Nominal harus lebih dari 0!"}), 400
    if 'kategori' in data:
        kategori_valid = ['makanan', 'transportasi', 'hiburan', 'tagihan', 'tempat_tinggal', 'pendidikan', 'kesehatan', 'belanja', 'lainnya', 'gaji', 'bonus', 'investasi', 'cicilan', 'tabungan', 'keluarga', 'zakat_donasi', 'asuransi', 'pemberian', 'penjualan']
        if data['kategori'] not in kategori_valid:
            return jsonify({"status": "error", "message": "Kategori tidak valid!"}), 400

    transaksi.jenis = data.get('jenis', transaksi.jenis)
    if 'nominal' in data:
        transaksi.nominal = nominal_val
    transaksi.kategori = data.get('kategori', transaksi.kategori)
    transaksi.deskripsi = data.get('deskripsi', transaksi.deskripsi)
    
    if 'tanggal' in data and data['tanggal']:
        tanggal = parse_date_yyyy_mm_dd(data['tanggal'])
        if not tanggal:
            return jsonify({"status": "error", "message": "Format tanggal harus YYYY-MM-DD!"}), 400
        transaksi.tanggal = tanggal
    
    try:
        db.session.commit()
        return jsonify({"status": "success", "message": "Data berhasil diperbarui!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Gagal memperbarui data: {str(e)}"}), 500


# ========================================================================
# ANGGARAN ENDPOINTS (PROTECTED — user_id scoped)
# ========================================================================

@app.route('/api/anggaran', methods=['GET'])
@login_required
def get_anggaran():
    """
    API endpoint to fetch budget allocations for the authenticated user.
    Supports filtering by month and year.
    """
    bulan = request.args.get('bulan')
    tahun = request.args.get('tahun')
    
    query = Anggaran.query.filter_by(user_id=session['user_id'])
    if bulan and tahun:
        query = query.filter_by(bulan=bulan, tahun=tahun)
        
    semua_anggaran = query.all()
    data_list = [anggaran.to_dict() for anggaran in semua_anggaran]
    return jsonify({
        "status": "success",
        "data": data_list
    }), 200


@app.route('/api/anggaran', methods=['POST'])
@login_required
def simpan_anggaran():
    """
    API endpoint to create or update a budget limit for a specific category.
    Checks for existing records in the given month/year and updates accordingly (Upsert logic).
    """
    data = request.get_json()
    kategori = data.get('kategori')
    batas = data.get('batas')
    bulan = data.get('bulan')
    tahun = data.get('tahun')

    if not kategori or batas is None or not bulan or not tahun:
        return jsonify({
            "status": "error",
            "message": "Kategori, batas, bulan, dan tahun wajib diisi!"
        }), 400

    # Cek apakah sudah ada anggaran untuk user + kategori + bulan + tahun ini
    existing = Anggaran.query.filter_by(
        user_id=session['user_id'],
        kategori=kategori,
        bulan=bulan,
        tahun=tahun
    ).first()
    
    try:
        batas = int(batas)
        bulan = int(bulan)
        tahun = int(tahun)
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Batas, bulan, dan tahun harus berupa angka!"}), 400

    if batas < 0:
        return jsonify({"status": "error", "message": "Batas anggaran tidak boleh negatif!"}), 400

    if existing:
        existing.batas = batas
    else:
        baru = Anggaran(
            user_id=session['user_id'],
            kategori=kategori,
            batas=batas,
            bulan=bulan,
            tahun=tahun
        )
        db.session.add(baru)

    try:
        db.session.commit()
        return jsonify({"status": "success", "message": "Anggaran berhasil disimpan!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Gagal menyimpan anggaran: {str(e)}"}), 500


@app.route('/api/anggaran/<int:id>', methods=['DELETE'])
@login_required
def hapus_anggaran(id):
    """API endpoint to delete a specific budget record securely."""
    anggaran = Anggaran.query.filter_by(id=id, user_id=session['user_id']).first()
    if not anggaran:
        return jsonify({"status": "error", "message": "Anggaran tidak ditemukan!"}), 404

    try:
        db.session.delete(anggaran)
        db.session.commit()
        return jsonify({"status": "success", "message": "Anggaran berhasil dihapus!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Gagal menghapus anggaran: {str(e)}"}), 500

@app.route('/api/anggaran/reset', methods=['DELETE'])
@login_required
def reset_anggaran():
    """API endpoint to delete all budget records for a specific month and year."""
    bulan = request.args.get('bulan', type=int)
    tahun = request.args.get('tahun', type=int)
    
    if not bulan or not tahun:
        return jsonify({"status": "error", "message": "Bulan dan tahun diperlukan!"}), 400
        
    try:
        Anggaran.query.filter_by(
            user_id=session['user_id'],
            bulan=bulan,
            tahun=tahun
        ).delete()
        
        db.session.commit()
        return jsonify({"status": "success", "message": "Semua anggaran berhasil dihapus!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Gagal mereset anggaran: {str(e)}"}), 500

# ========================================================================
# SAVINGS GOAL ENDPOINTS
# ========================================================================

@app.route('/api/savings-goals', methods=['GET'])
@login_required
def get_savings_goals():
    """
    API endpoint to retrieve all savings goals for the authenticated user,
    ordered by the most recently updated.
    """
    goals = SavingsGoal.query.filter_by(user_id=session['user_id']).order_by(SavingsGoal.updated_at.desc()).all()
    return jsonify({
        "status": "success",
        "data": [goal.to_dict() for goal in goals]
    }), 200


@app.route('/api/savings-goals', methods=['POST'])
@login_required
def create_savings_goal():
    """
    API endpoint to create a new savings goal.
    Validates target amounts, logical constraints (no negative numbers), and date formatting.
    Automatically determines the initial status based on current savings vs target.
    """
    data = request.get_json() or {}
    required_fields = ['namaGoal', 'targetAmount', 'deadline']

    if any(data.get(field) in (None, '') for field in required_fields):
        return jsonify({"status": "error", "message": "Nama goal, target, dan deadline wajib diisi!"}), 400

    if not is_valid_yyyy_mm(data.get('deadline')):
        return jsonify({"status": "error", "message": "Format deadline harus YYYY-MM!"}), 400

    try:
        target_amount = int(data.get('targetAmount'))
        current_savings = int(data.get('currentSavings') or 0)
        monthly_income = int(data.get('monthlyIncome') or 0)
        monthly_expenses = int(data.get('monthlyExpenses') or 0)
    except (ValueError, TypeError):
        return jsonify({"status": "error", "message": "Nominal harus berupa angka!"}), 400

    if target_amount <= 0:
        return jsonify({"status": "error", "message": "Target tabungan harus lebih dari 0!"}), 400

    if min(current_savings, monthly_income, monthly_expenses) < 0:
        return jsonify({"status": "error", "message": "Nominal tidak boleh negatif!"}), 400

    goal = SavingsGoal(
        user_id=session['user_id'],
        nama_goal=data.get('namaGoal').strip(),
        target_amount=target_amount,
        current_savings=current_savings,
        monthly_income=monthly_income,
        monthly_expenses=monthly_expenses,
        deadline=data.get('deadline'),
        ai_plan=data.get('aiPlan', ''),
        status='completed' if current_savings >= target_amount else 'active'
    )

    try:
        db.session.add(goal)
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Goal tabungan berhasil disimpan!",
            "data": goal.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Gagal menyimpan goal tabungan: {str(e)}"}), 500


@app.route('/api/savings-goals/<int:id>', methods=['PUT'])
@login_required
def update_savings_goal(id):
    """
    API endpoint to update an existing savings goal.
    Iterates over numeric fields for validation and dynamically adjusts the goal status 
    (e.g., setting it to 'completed' if current savings reach the target).
    """
    goal = SavingsGoal.query.filter_by(id=id, user_id=session['user_id']).first()
    if not goal:
        return jsonify({"status": "error", "message": "Goal tabungan tidak ditemukan!"}), 404

    data = request.get_json() or {}

    if 'deadline' in data and not is_valid_yyyy_mm(data.get('deadline')):
        return jsonify({"status": "error", "message": "Format deadline harus YYYY-MM!"}), 400

    numeric_fields = {
        'targetAmount': 'target_amount',
        'currentSavings': 'current_savings',
        'monthlyIncome': 'monthly_income',
        'monthlyExpenses': 'monthly_expenses'
    }

    for request_key, attr_name in numeric_fields.items():
        if request_key in data:
            try:
                value = int(data.get(request_key) or 0)
            except (ValueError, TypeError):
                return jsonify({"status": "error", "message": "Nominal harus berupa angka!"}), 400

            if request_key == 'targetAmount' and value <= 0:
                return jsonify({"status": "error", "message": "Target tabungan harus lebih dari 0!"}), 400

            if request_key != 'targetAmount' and value < 0:
                return jsonify({"status": "error", "message": "Nominal tidak boleh negatif!"}), 400

            setattr(goal, attr_name, value)

    if 'namaGoal' in data:
        nama_goal = data.get('namaGoal', '').strip()
        if not nama_goal:
            return jsonify({"status": "error", "message": "Nama goal wajib diisi!"}), 400
        goal.nama_goal = nama_goal

    if 'deadline' in data:
        goal.deadline = data.get('deadline')

    if 'aiPlan' in data:
        goal.ai_plan = data.get('aiPlan') or ''

    if 'status' in data and data.get('status') in ('active', 'completed', 'paused'):
        goal.status = data.get('status')
    elif goal.current_savings >= goal.target_amount:
        goal.status = 'completed'
    elif goal.status == 'completed' and goal.current_savings < goal.target_amount:
        goal.status = 'active'

    try:
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Goal tabungan berhasil diperbarui!",
            "data": goal.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Gagal memperbarui goal tabungan: {str(e)}"}), 500


@app.route('/api/savings-goals/<int:id>', methods=['DELETE'])
@login_required
def delete_savings_goal(id):
    """API endpoint to securely delete a user's savings goal."""
    goal = SavingsGoal.query.filter_by(id=id, user_id=session['user_id']).first()
    if not goal:
        return jsonify({"status": "error", "message": "Goal tabungan tidak ditemukan!"}), 404

    try:
        db.session.delete(goal)
        db.session.commit()
        return jsonify({"status": "success", "message": "Goal tabungan berhasil dihapus!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Gagal menghapus goal tabungan: {str(e)}"}), 500


# ========================================================================
# USER SETTINGS & DATA MANAGEMENT ENDPOINTS
# ========================================================================

@app.route('/api/preferences', methods=['GET'])
@login_required
def get_preferences():
    """API endpoint to retrieve application-wide user preferences (e.g., currency, language)."""
    preferences = get_or_create_preferences(session['user_id'])
    return jsonify({"status": "success", "data": preferences.to_dict()}), 200


@app.route('/api/preferences', methods=['PUT'])
@login_required
def update_preferences():
    """API endpoint to update user preferences, restricting values to supported currencies and languages."""
    data = request.get_json() or {}
    preferences = get_or_create_preferences(session['user_id'])

    currency = data.get('currency', preferences.currency)
    language = data.get('language', preferences.language)

    if currency not in ('IDR', 'USD', 'SGD', 'MYR'):
        return jsonify({"status": "error", "message": "Mata uang tidak didukung!"}), 400

    if language not in ('id', 'en'):
        return jsonify({"status": "error", "message": "Bahasa tidak didukung!"}), 400

    preferences.currency = currency
    preferences.language = language
    preferences.notif_email = bool(data.get('notif_email', preferences.notif_email))
    preferences.notif_budget = bool(data.get('notif_budget', preferences.notif_budget))

    try:
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Preferensi berhasil disimpan!",
            "data": preferences.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Gagal menyimpan preferensi: {str(e)}"}), 500


@app.route('/api/user/data', methods=['DELETE'])
@login_required
def delete_user_data():
    """API endpoint to purge all financial records (transactions, budgets, goals, notifications) without deleting the account."""
    try:
        Transaksi.query.filter_by(user_id=session['user_id']).delete()
        Anggaran.query.filter_by(user_id=session['user_id']).delete()
        SavingsGoal.query.filter_by(user_id=session['user_id']).delete()
        NotificationLog.query.filter_by(user_id=session['user_id']).delete()
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": "Semua transaksi, anggaran, goal tabungan, dan notifikasi berhasil dihapus."
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Gagal menghapus data: {str(e)}"}), 500


@app.route('/api/user/transactions', methods=['DELETE'])
@login_required
def delete_all_transactions():
    """API endpoint to delete only transaction records for the authenticated user."""
    try:
        deleted = Transaksi.query.filter_by(user_id=session['user_id']).delete()
        db.session.commit()
        return jsonify({
            "status": "success",
            "message": f"{deleted} transaksi berhasil dihapus."
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": f"Gagal menghapus transaksi: {str(e)}"}), 500


@app.route('/api/notifications', methods=['GET'])
@login_required
def get_notifications():
    """
    API endpoint to retrieve the user's notification history.
    Automatically triggers budget alert synchronization before fetching records.
    """
    bulan = request.args.get('bulan')
    tahun = request.args.get('tahun')
    build_budget_alerts(session['user_id'], bulan, tahun, persist=True)

    notifications = NotificationLog.query.filter_by(user_id=session['user_id']).order_by(NotificationLog.created_at.desc()).limit(50).all()
    return jsonify({
        "status": "success",
        "data": [item.to_dict() for item in notifications]
    }), 200


@app.route('/api/notifications/<int:id>/read', methods=['PUT'])
@login_required
def mark_notification_read(id):
    """API endpoint to mark a specific notification as 'read'."""
    notification = NotificationLog.query.filter_by(id=id, user_id=session['user_id']).first()
    if not notification:
        return jsonify({"status": "error", "message": "Notifikasi tidak ditemukan!"}), 404

    notification.status = 'read'
    db.session.commit()
    return jsonify({"status": "success", "message": "Notifikasi ditandai sudah dibaca.", "data": notification.to_dict()}), 200


@app.route('/api/budget-alerts', methods=['GET'])
@login_required
def get_budget_alerts():
    """API endpoint to dynamically generate and fetch real-time budget alerts."""
    bulan = request.args.get('bulan')
    tahun = request.args.get('tahun')
    alerts = build_budget_alerts(session['user_id'], bulan, tahun, persist=True)
    return jsonify({"status": "success", "data": alerts}), 200


@app.route('/api/reports/summary', methods=['GET'])
@login_required
def get_report_summary():
    """
    API endpoint to generate a comprehensive financial summary report.
    Aggregates income, expenses, category breakdowns, and budget limits directly via SQL functions.
    """
    bulan = request.args.get('bulan')
    tahun = request.args.get('tahun')
    now = datetime.now()
    bulan_int = int(bulan or now.month)
    tahun_int = int(tahun or now.year)

    # Aggregate income and expenses directly in DB
    agregasi = db.session.query(
        Transaksi.jenis, func.sum(Transaksi.nominal)
    ).filter(
        Transaksi.user_id == session['user_id'],
        extract('month', Transaksi.tanggal) == bulan_int,
        extract('year', Transaksi.tanggal) == tahun_int
    ).group_by(Transaksi.jenis).all()
    
    pemasukan = 0
    pengeluaran = 0
    for jenis, total in agregasi:
        if jenis == 'pemasukan':
            pemasukan = int(total)
        elif jenis == 'pengeluaran':
            pengeluaran = int(total)
            
    saldo = pemasukan - pengeluaran

    # Aggregate category expenses
    agregasi_kategori = db.session.query(
        Transaksi.kategori, func.sum(Transaksi.nominal)
    ).filter(
        Transaksi.user_id == session['user_id'],
        Transaksi.jenis == 'pengeluaran',
        extract('month', Transaksi.tanggal) == bulan_int,
        extract('year', Transaksi.tanggal) == tahun_int
    ).group_by(Transaksi.kategori).all()
    
    kategori = {kat: int(total) for kat, total in agregasi_kategori}

    budgets = Anggaran.query.filter_by(user_id=session['user_id'], bulan=bulan_int, tahun=tahun_int).all()
    budget_summary = []
    for budget in budgets:
        used = kategori.get(budget.kategori, 0)
        budget_summary.append({
            "id": budget.id,
            "kategori": budget.kategori,
            "limit": budget.batas,
            "used": used,
            "remaining": budget.batas - used,
            "percentage": round((used / budget.batas) * 100, 2) if budget.batas > 0 else 0
        })

    goals = SavingsGoal.query.filter_by(user_id=session['user_id']).all()
    alerts = build_budget_alerts(session['user_id'], bulan_int, tahun_int, persist=True)

    return jsonify({
        "status": "success",
        "period": {"bulan": bulan_int, "tahun": tahun_int},
        "summary": {
            "total_pemasukan": pemasukan,
            "total_pengeluaran": pengeluaran,
            "saldo": saldo,
            "jumlah_transaksi": len(transaksi)
        },
        "kategori_pengeluaran": kategori,
        "budget_summary": budget_summary,
        "savings_goals": [goal.to_dict() for goal in goals],
        "alerts": alerts
    }), 200


# ========================================================================
# AI ADVISOR ENDPOINT (PROTECTED — Gemini Integration)
# ========================================================================

@app.route('/api/analisis-ai', methods=['POST'])
@login_required
def analisis_ai():
    """
    API endpoint for the AI Financial Advisor.
    Assembles user contexts, limits, and historical chat payloads into a strict prompt.
    Uses Server-Sent Events (SSE) to stream the LLM text response back to the client.
    """
    data = request.get_json()
    pesan_user = data.get('pesan', '')
    konteks = data.get('konteks', {})
    
    # Ambil history percakapan (jika ada)
    history = data.get('history', [])
    
    total_pemasukan = konteks.get('pemasukan', 0)
    total_pengeluaran = konteks.get('pengeluaran', 0)
    saldo = konteks.get('saldo', 0)
    breakdown = konteks.get('breakdown', {})
    currency = konteks.get('currency', 'IDR') # Default ke IDR agar lebih aman jika tidak ada
    lang = konteks.get('language', 'id')
    
    curr_symbol = "$" if currency == "USD" else "Rp"
    
    def format_money(val):
        if currency == "USD":
            return f"${val:,.2f}"
        else:
            # Format IDR: Rp 1.000.000
            s = f"{int(val):,}"
            return f"Rp {s.replace(',', '.')}"
    
    # Ambil Target Tabungan dari DB
    savings_goals = SavingsGoal.query.filter_by(user_id=session['user_id']).all()
    savings_text = "Rencana Tabungan Aktif:\n"
    if savings_goals:
        for goal in savings_goals:
            savings_text += f"  - {goal.nama_goal}: {format_money(goal.current_savings)} dari {format_money(goal.target_amount)}\n"
    else:
        savings_text = "  (Belum ada target tabungan)\n"
    
    # Ambil Batas Anggaran dari DB (Untuk Bulan & Tahun Ini)
    from datetime import datetime
    now = datetime.now()
    bulan_int = konteks.get('bulan', now.month)
    tahun_int = konteks.get('tahun', now.year)
    
    anggaran_list = Anggaran.query.filter_by(user_id=session['user_id'], bulan=bulan_int, tahun=tahun_int).all()
    anggaran_text = "Batas Anggaran Bulanan:\n"
    total_rencana_anggaran = 0
    if anggaran_list:
        for angg in anggaran_list:
            anggaran_text += f"  - {angg.kategori}: {format_money(angg.batas)}\n"
            total_rencana_anggaran += angg.batas
    else:
        anggaran_text += "  (Belum ada batas anggaran yang diatur)\n"
    
    # Format breakdown menjadi teks
    breakdown_text = ""
    if breakdown:
        for kat, nominal in breakdown.items():
            breakdown_text += f"  - {kat}: {format_money(nominal)}\n"
    
    lang_instruction = "You MUST answer strictly in ENGLISH." if lang == 'en' else "Gunakan Bahasa Indonesia yang rapi."
    
    system_prompt = f"""Kamu adalah WealthVision AI, asisten keuangan pribadi profesional, analitis, dan suportif. Tugas utamamu HANYA memberikan saran tentang manajemen keuangan, budgeting, tabungan, dan investasi.

[ATURAN KETAT - WAJIB DIPATUHI]:
1. FOKUS KEUANGAN: Tolak dengan sopan SEMUA pertanyaan yang tidak berhubungan dengan keuangan, ekonomi, atau budgeting.
2. TOLAK CODING/TEKNOLOGI: Jika pengguna meminta kode pemrograman (HTML, Python, dll), meretas perangkat lunak, atau membahas masalah teknis IT, kamu HARUS menolak dengan: "Maaf, saya adalah asisten keuangan WealthVision. Saya tidak diprogram untuk membahas pemrograman atau masalah teknis IT. Mari kita kembali membahas kondisi keuangan Anda."
3. NADA BICARA & BAHASA: Profesional, langsung pada intinya, suportif. {lang_instruction}
4. JANGAN ASUMSI: Jika Total Pemasukan Nyata lebih kecil dari Total Rencana Anggaran, pahami bahwa pengguna mungkin belum memasukkan semua gajinya ke sistem. Evaluasi anggaran berdasarkan 'Total Rencana Anggaran'.

[DATA KEUANGAN PENGGUNA SAAT INI]:
- Total Pemasukan Nyata (Tercatat): {format_money(total_pemasukan)}
- Total Pengeluaran Nyata: {format_money(total_pengeluaran)}  
- Rincian Pengeluaran per Kategori:
{breakdown_text if breakdown_text else '  (Belum ada data pengeluaran)'}
- Total Rencana Anggaran (Limit Total): {format_money(total_rencana_anggaran)}
- Aturan Batas Anggaran per Kategori:
{anggaran_text}
- Target Tabungan Pengguna:
{savings_text if savings_text else '  (Belum ada target tabungan)'}

Berdasarkan aturan di atas dan data pengguna, berikan saran spesifik dan actionable.
"""

    nvidia_key = os.getenv('NVIDIA_API_KEY')
    if nvidia_key:
        llm_api_key = nvidia_key
        llm_base_url = os.getenv('NVIDIA_BASE_URL', 'https://integrate.api.nvidia.com/v1')
        llm_model = os.getenv('NVIDIA_MODEL', 'meta/llama3-70b-instruct')
    else:
        llm_api_key = os.getenv('LLM_API_KEY')
        llm_base_url = os.getenv('LLM_BASE_URL', 'https://openrouter.ai/api/v1')
        llm_model = os.getenv('LLM_MODEL', 'google/gemini-2.0-flash-lite-preview-02-05:free')

    
    # Jika tidak ada API key
    if not llm_api_key or llm_api_key.startswith('sk-or-v1-xxxxx'):
        def fallback_generate():
            yield _analisis_fallback(total_pemasukan, total_pengeluaran, saldo, breakdown)
        return Response(fallback_generate(), mimetype='text/plain')
    
    try:
        client = OpenAI(
            base_url=llm_base_url,
            api_key=llm_api_key,
        )
        
        def generate():
            try:
                # Susun payload percakapan
                openai_messages = [{"role": "system", "content": system_prompt}]
                
                # Masukkan history (hanya 10 pesan terakhir agar hemat token)
                for msg in history[-10:]:
                    role = msg.get('role')
                    # OpenAI API hanya menerima role: system, user, assistant
                    if role == 'ai':
                        role = 'assistant'
                    openai_messages.append({"role": role, "content": msg.get('content', '')})
                
                # Masukkan pesan user saat ini
                openai_messages.append({"role": "user", "content": pesan_user})

                response = client.chat.completions.create(
                    model=llm_model,
                    messages=openai_messages,
                    temperature=0.2,
                    max_tokens=2000,
                    top_p=0.9,
                    stream=True
                )
                for chunk in response:
                    # Pastikan choices tidak kosong sebelum mengaksesnya
                    if hasattr(chunk, 'choices') and len(chunk.choices) > 0:
                        content = chunk.choices[0].delta.content
                        if content is not None:
                            yield content
            except Exception as stream_err:
                print(f"Stream error: {stream_err}")
                yield "\n\n[Maaf, terjadi gangguan saat menghasilkan respon. Silakan coba lagi.]"
                
        return Response(generate(), mimetype='text/plain')
    except Exception as e:
        print(f"LLM API Error: {e}")
        def error_generate():
            yield _analisis_fallback(total_pemasukan, total_pengeluaran, saldo, breakdown)
        return Response(error_generate(), mimetype='text/plain')


@app.route('/api/budget-planner-ai', methods=['POST'])
@login_required
def budget_planner_ai():
    """
    API endpoint to generate a 50/30/20 budget allocation strategy using LLM.
    Forces the AI to return a strict JSON object mapped to 'needs', 'wants', and 'savings'.
    """
    data = request.get_json()
    pemasukan = data.get('pemasukan', 0)
    pengeluaran = data.get('pengeluaran', 0)
    saldo = pemasukan - pengeluaran

    pref = UserPreference.query.filter_by(user_id=session['user_id']).first()
    currency = pref.currency if pref else "IDR"
    language = pref.language if pref else "id"
    
    curr_symbol = "$" if currency == "USD" else "Rp"
    def format_money(val):
        return f"{curr_symbol}{val:,.2f}" if currency == "USD" else f"Rp {val:,}"

    lang_instruction = "IMPORTANT: Write the 'deskripsi' and 'rekomendasi' strictly in ENGLISH." if language == 'en' else "Gunakan Bahasa Indonesia."

    system_prompt = f"""Kamu adalah WealthVision AI. Tugasmu adalah membagi sisa uang pengguna ke dalam aturan alokasi anggaran (misal 50/30/20). {lang_instruction}
Kondisi Keuangan Anda Saat Ini:
Pemasukan: {format_money(pemasukan)}
Pengeluaran saat ini: {format_money(pengeluaran)}
Saldo tersisa: {format_money(saldo)}

Kamu WAJIB mengembalikan JSON murni dengan skema berikut:
{{
  "needs": {{"nominal": angka_integer, "deskripsi": "string penjelasan"}},
  "wants": {{"nominal": angka_integer, "deskripsi": "string penjelasan"}},
  "savings": {{"nominal": angka_integer, "deskripsi": "string penjelasan"}},
  "rekomendasi": ["string", "string", "string"]
}}
"""

    nvidia_key = os.getenv('NVIDIA_API_KEY')
    if nvidia_key:
        llm_api_key = nvidia_key
        llm_base_url = os.getenv('NVIDIA_BASE_URL', 'https://integrate.api.nvidia.com/v1')
        llm_model = os.getenv('NVIDIA_MODEL', 'meta/llama3-70b-instruct')
    else:
        llm_api_key = os.getenv('LLM_API_KEY')
        llm_base_url = os.getenv('LLM_BASE_URL', 'https://openrouter.ai/api/v1')
        llm_model = os.getenv('LLM_MODEL', 'google/gemini-2.0-flash-lite-preview-02-05:free')

    if not llm_api_key or llm_api_key.startswith('sk-or-v1-xxxxx'):
        return jsonify({"status": "error", "message": "API Key belum dikonfigurasi."}), 500

    try:
        client = OpenAI(base_url=llm_base_url, api_key=llm_api_key)
        response = client.chat.completions.create(
            model=llm_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Berikan rekomendasi pembagian uang saya dalam format JSON yang valid."}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=600
        )
        
        import json as python_json
        result_str = response.choices[0].message.content
        result_json = python_json.loads(result_str)
        return jsonify({"status": "success", "data": result_json}), 200
    except Exception as e:
        print(f"JSON LLM Error: {e}")
        return jsonify({"status": "error", "message": "Gagal memproses data JSON via AI."}), 500


def _analisis_fallback(pemasukan, pengeluaran, saldo, breakdown):
    """Rule-based fallback mechanism to provide basic financial analysis when the LLM API is unavailable."""
    pref = UserPreference.query.filter_by(user_id=session['user_id']).first()
    currency = pref.currency if pref else "USD"
    curr_symbol = "$" if currency == "USD" else "Rp"
    def format_money(val):
        return f"{curr_symbol}{val:,.2f}" if currency == "USD" else f"Rp {val:,}"

    lines = []
    
    if pemasukan == 0 and pengeluaran == 0:
        return "📊 Belum ada data transaksi bulan ini. Mulailah mencatat pemasukan dan pengeluaran Anda agar saya bisa memberikan analisis yang akurat!"
    
    # Analisis rasio
    if pemasukan > 0:
        rasio = (pengeluaran / pemasukan) * 100
        lines.append(f"📊 **Ringkasan Keuangan Bulan Ini:**")
        lines.append(f"- Pemasukan: {format_money(pemasukan)}")
        lines.append(f"- Pengeluaran: {format_money(pengeluaran)}")
        lines.append(f"- Rasio Pengeluaran: {rasio:.1f}% dari pemasukan")
        lines.append("")
        
        if rasio > 100:
            lines.append(f"⚠️ **Peringatan!** Pengeluaran Anda melebihi pemasukan sebesar {format_money(abs(saldo))}.")
            lines.append("Saran: Segera review pengeluaran terbesar dan potong yang tidak esensial.")
        elif rasio > 80:
            lines.append(f"🟡 **Perhatian!** Anda sudah menghabiskan {rasio:.0f}% pemasukan.")
            lines.append("Saran: Sisihkan minimal 20% pemasukan untuk tabungan darurat.")
        elif rasio > 50:
            lines.append(f"✅ **Cukup Baik!** Rasio pengeluaran {rasio:.0f}% masih dalam batas wajar.")
            lines.append("Saran: Pertimbangkan mengalokasikan 10-15% untuk investasi jangka panjang.")
        else:
            lines.append(f"🌟 **Sangat Baik!** Rasio pengeluaran hanya {rasio:.0f}%. Anda sangat hemat!")
            lines.append("Saran: Alokasikan sisa dana ke instrumen investasi (reksa dana, saham, atau deposito).")
    else:
        lines.append(f"📊 Total pengeluaran bulan ini: {format_money(pengeluaran)}")
        lines.append("💡 Belum ada data pemasukan. Catat pemasukan Anda agar analisis lebih akurat.")
    
    # Analisis kategori terbesar
    if breakdown:
        sorted_kat = sorted(breakdown.items(), key=lambda x: x[1], reverse=True)
        if sorted_kat:
            top_kat, top_nominal = sorted_kat[0]
            lines.append(f"\n🔍 **Kategori terbesar:** {top_kat} ({format_money(top_nominal)})")
            if pemasukan > 0:
                persen_top = (top_nominal / pemasukan) * 100
                lines.append(f"Kategori ini menghabiskan {persen_top:.1f}% dari pemasukan Anda.")
    
    return "\n".join(lines)


# ========================================================================
# ENTERPRISE PILLAR: ERROR HANDLING & SECURITY
# ========================================================================

@app.errorhandler(Exception)
def handle_exception(e):
    """Global Exception Handler for gracefully catching 500 crashes."""
    db.session.rollback()  # Rollback any pending transactions safely
    
    # Do not leak stack traces in production JSON response
    app.logger.error(f"Server Error: {e}")
    
    return jsonify({
        "status": "error",
        "message": "Terjadi kesalahan sistem internal. Tim dukungan kami telah dinotifikasi.",
        "code": "INTERNAL_SERVER_ERROR"
    }), 500

@app.after_request
def apply_security_headers(response):
    """Global Security Headers to prevent XSS, Clickjacking, and Sniffing."""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # Basic Content-Security-Policy (can be configured further)
    response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;"
    return response


# ========================================================================
# RUN APPLICATION
# ========================================================================
if __name__ == '__main__':
    app.run(debug=os.getenv('FLASK_DEBUG') == 'true')