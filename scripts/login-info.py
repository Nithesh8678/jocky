from pathlib import Path
root=Path(__file__).resolve().parents[1]
values=dict(line.split('=',1) for line in (root/'.env').read_text().splitlines() if '=' in line)
print('JOCKY local login — keep this output private')
print('URL: http://127.0.0.1:3100')
print('Email:',values['ADMIN_EMAIL'])
print('Password:',values['ADMIN_PASSWORD'])
