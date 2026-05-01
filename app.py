from flask import Flask, render_template

# Inisialisasi aplikasi Flask
app = Flask(__name__)

# Rute utama (Halaman Dashboard)
@app.route('/')
def home():
    # Perintah ini akan otomatis mencari file 'dashboard.html' di dalam folder 'templates'
    return render_template('dashboard.html')

@app.route('/budgeting')
def budgeting():
    return render_template('budgeting.html')

@app.route('/expenses')
def expenses():
    return render_template('expenses.html')

@app.route('/ai-advisor')
def ai_advisor():
    return render_template('ai_advisor.html')

@app.route('/settings')
def settings():
    return render_template('settings.html')

@app.route('/portfolio')
def portfolio():
    return render_template('portfolio.html')

@app.route('/insights')
def insights():
    return render_template('insights.html')

@app.route('/reports')
def reports():
    return render_template('reports.html')
# Menjalankan server
if __name__ == '__main__':
    # Mode debug=True membuat server otomatis refresh jika Anda menyimpan perubahan pada kode
    app.run(debug=True)