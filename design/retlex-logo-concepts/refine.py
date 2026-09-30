from pathlib import Path
p=Path('design/retlex-logo-concepts')
for k in 'abc':
 s=(p/f'{k}-v1.svg').read_text()
 if k=='a': s=s.replace('<path ', '<g transform="translate(-8 0)"><path ').replace('</svg>','</g></svg>')
 (p/f'{k}-v2.svg').write_text(s)
